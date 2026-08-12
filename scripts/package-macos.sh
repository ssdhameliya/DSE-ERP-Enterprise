#!/bin/zsh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
VERSION="${1:-$(mvn help:evaluate -Dexpression=project.version -q -DforceStdout | tail -1)}"
if [[ ! "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+([.-][0-9A-Za-z.-]+)?$ ]]; then
  echo "Invalid application version: $VERSION" >&2
  exit 1
fi

ARCH="$(uname -m)"
case "$ARCH" in
  arm64) ARCH_LABEL="arm64" ;;
  x86_64) ARCH_LABEL="x86_64" ;;
  *) echo "Unsupported macOS architecture: $ARCH" >&2; exit 1 ;;
esac

echo "Building DSE ERP $VERSION for macOS $ARCH_LABEL..."
mvn -B -ntp clean verify

JAR="$ROOT/desktop/target/DSE_Final.jar"
SERVER_JAR="$ROOT/server/target/dse-erp-server.jar"
[[ -f "$JAR" ]] || { echo "Packaged desktop JAR not found: $JAR" >&2; exit 1; }
[[ -f "$SERVER_JAR" ]] || { echo "Packaged server JAR not found: $SERVER_JAR" >&2; exit 1; }
INPUT="$ROOT/target/jpackage-input"
DEST="$ROOT/target/macos-installer"
APP_IMAGE="$ROOT/target/macos-app-image"
rm -rf "$INPUT" "$DEST" "$APP_IMAGE"
mkdir -p "$INPUT" "$DEST" "$APP_IMAGE"
cp "$JAR" "$INPUT/DSE_Final.jar"
mkdir -p "$INPUT/server"
cp "$SERVER_JAR" "$INPUT/server/dse-erp-server.jar"

# 5.1.44 managed PostgreSQL payload. For release packaging, point
# DSE_POSTGRES_RUNTIME_DIR at a verified PostgreSQL 18 binary distribution for this architecture.
POSTGRES_RUNTIME="${DSE_POSTGRES_RUNTIME_DIR:-}"
if [[ -z "$POSTGRES_RUNTIME" ]]; then
  for candidate in "/opt/homebrew/opt/postgresql@18" "/usr/local/opt/postgresql@18" "/Library/PostgreSQL/18"; do
    if [[ -x "$candidate/bin/initdb" ]]; then POSTGRES_RUNTIME="$candidate"; break; fi
  done
fi
[[ -n "$POSTGRES_RUNTIME" && -x "$POSTGRES_RUNTIME/bin/initdb" ]] || {
  echo "PostgreSQL 18 runtime not found. Set DSE_POSTGRES_RUNTIME_DIR to a verified PostgreSQL 18 binary distribution." >&2
  exit 1
}
mkdir -p "$INPUT/runtime/postgresql"
for folder in bin lib share; do
  [[ -d "$POSTGRES_RUNTIME/$folder" ]] || { echo "PostgreSQL runtime folder missing: $POSTGRES_RUNTIME/$folder" >&2; exit 1; }
  cp -R "$POSTGRES_RUNTIME/$folder" "$INPUT/runtime/postgresql/$folder"
done

# Homebrew bottles retain absolute references to their Cellar dependencies.
# Collect every non-system dependency into the application and rewrite each
# Mach-O load command relative to the binary that uses it. This makes the
# managed PostgreSQL runtime independent of Homebrew on the customer's Mac.
bundle_postgres_dylibs() {
  local bundle="$1"
  local dependencies="$bundle/lib/dse-deps"
  local candidate binary dependency name destination relative reference install_id
  local index=1
  typeset -a queue
  typeset -A processed

  mkdir -p "$dependencies"
  while IFS= read -r -d '' candidate; do
    if file -b "$candidate" | grep -q 'Mach-O'; then
      queue+=("$candidate")
    fi
  done < <(find "$bundle/bin" "$bundle/lib" -type f -print0)

  while (( index <= ${#queue[@]} )); do
    binary="${queue[$index]}"
    (( index += 1 ))
    [[ -n "${processed[$binary]-}" ]] && continue
    processed[$binary]=1

    install_id="$(otool -D "$binary" 2>/dev/null | tail -n +2 | head -n 1 || true)"
    if [[ -n "$install_id" && "$install_id" != @loader_path/* ]]; then
      install_name_tool -id "@loader_path/$(basename "$binary")" "$binary"
    fi

    while IFS= read -r dependency; do
      [[ -n "$dependency" ]] || continue
      case "$dependency" in
        /System/Library/*|/usr/lib/*|@loader_path/*|@executable_path/*|@rpath/*)
          continue
          ;;
      esac
      [[ "$dependency" == /* ]] || {
        echo "Unsupported PostgreSQL library reference in $binary: $dependency" >&2
        exit 1
      }
      [[ -e "$dependency" ]] || {
        echo "PostgreSQL dependency is missing on the build runner: $dependency" >&2
        exit 1
      }

      name="$(basename "$dependency")"
      destination="$dependencies/$name"
      if [[ ! -e "$destination" ]]; then
        cp -L "$dependency" "$destination"
        queue+=("$destination")
      elif ! cmp -s "$dependency" "$destination"; then
        echo "Conflicting PostgreSQL dependencies share the filename $name" >&2
        exit 1
      fi

      relative="$(python3 -c 'import os,sys; print(os.path.relpath(sys.argv[2], os.path.dirname(sys.argv[1])))' "$binary" "$destination")"
      reference="@loader_path/$relative"
      install_name_tool -change "$dependency" "$reference" "$binary"
    done < <(otool -L "$binary" | tail -n +2 | awk '{print $1}')
  done

  for binary in "${queue[@]}"; do
    codesign --force --sign - "$binary" >/dev/null
  done

  for binary in "${queue[@]}"; do
    while IFS= read -r dependency; do
      case "$dependency" in
        /System/Library/*|/usr/lib/*|@loader_path/*|@executable_path/*|@rpath/*|'')
          ;;
        /*)
          echo "Unbundled absolute library reference remains in $binary: $dependency" >&2
          exit 1
          ;;
      esac
    done < <(otool -L "$binary" | tail -n +2 | awk '{print $1}')

    while IFS= read -r reference; do
      case "$reference" in
        /System/Library/*|/usr/lib/*|@loader_path/*|@executable_path/*|@rpath/*|'')
          ;;
        /*)
          echo "Unbundled absolute runtime search path remains in $binary: $reference" >&2
          exit 1
          ;;
      esac
    done < <(otool -l "$binary" | awk '$1 == "cmd" && $2 == "LC_RPATH" { getline; getline; print $2 }')
  done

  echo "Bundled and relocated ${#queue[@]} PostgreSQL Mach-O files."
}

bundle_postgres_dylibs "$INPUT/runtime/postgresql"
cp "$ROOT/runtime/runtime-manifest.properties" "$INPUT/runtime/runtime-manifest.properties"
echo "Bundled PostgreSQL runtime: $POSTGRES_RUNTIME"
python3 "$ROOT/scripts/verify-production-bundle.py" "$INPUT"

PNG="$ROOT/desktop/src/main/resources/installer/logo-1024.png"
ICNS="$ROOT/target/DSE-ERP.icns"
if [[ -f "$PNG" ]]; then
  ICONSET="$ROOT/target/DSE-ERP.iconset"
  rm -rf "$ICONSET" && mkdir -p "$ICONSET"
  for size in 16 32 128 256 512; do
    sips -z "$size" "$size" "$PNG" --out "$ICONSET/icon_${size}x${size}.png" >/dev/null
    double=$((size * 2))
    sips -z "$double" "$double" "$PNG" --out "$ICONSET/icon_${size}x${size}@2x.png" >/dev/null
  done
  iconutil -c icns "$ICONSET" -o "$ICNS"
fi

COMMON=(
  --name "DSE ERP"
  --app-version "$VERSION"
  --vendor "DS Engineers"
  --description "DSE ERP desktop business management application"
  --copyright "Copyright (c) DS Engineers"
  --input "$INPUT"
  --main-jar "DSE_Final.jar"
  --main-class "org.example.app.Launcher"
  --jlink-options "--strip-debug --no-man-pages --no-header-files"
  --java-options "-Dfile.encoding=UTF-8"
  --java-options "--enable-native-access=ALL-UNNAMED"
  --java-options "-Ddse.erp.nativeAccessRelaunch=true"
  --java-options "-Ddse.erp.packaged=true"
  --mac-package-identifier "com.dsengineers.dseerp"
  --mac-package-name "DSE ERP"
)
[[ -f "$ICNS" ]] && COMMON+=(--icon "$ICNS")

jpackage --type app-image "${COMMON[@]}" --dest "$APP_IMAGE"

BUNDLED_JAVA="$APP_IMAGE/DSE ERP.app/Contents/runtime/Contents/Home/bin/java"
if [[ ! -x "$BUNDLED_JAVA" ]]; then
  echo "ERROR: Production app image is missing bundled Java launcher: $BUNDLED_JAVA" >&2
  exit 1
fi
echo "Verified bundled Java launcher: $BUNDLED_JAVA"

PACKAGED_INITDB="$APP_IMAGE/DSE ERP.app/Contents/app/runtime/postgresql/bin/initdb"
[[ -x "$PACKAGED_INITDB" ]] || {
  echo "ERROR: Production app image is missing managed PostgreSQL initdb: $PACKAGED_INITDB" >&2
  exit 1
}
env -i HOME="$HOME" PATH="/usr/bin:/bin" "$PACKAGED_INITDB" --version
echo "Verified managed PostgreSQL starts without Homebrew from inside the app image."

jpackage --type dmg "${COMMON[@]}" --dest "$DEST"

DMG="$(find "$DEST" -maxdepth 1 -name '*.dmg' -print -quit)"
[[ -n "$DMG" ]] || { echo "macOS DMG was not produced." >&2; exit 1; }
FINAL="DSE-ERP-$VERSION-macOS-$ARCH_LABEL.dmg"
mv "$DMG" "$DEST/$FINAL"
shasum -a 256 "$DEST/$FINAL" | sed "s#  .*/#  #" > "$DEST/checksums-macos-$ARCH_LABEL.txt"
echo "Created: $DEST/$FINAL"
