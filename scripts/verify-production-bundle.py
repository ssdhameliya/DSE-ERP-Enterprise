#!/usr/bin/env python3
from pathlib import Path
import os
import platform
import subprocess
import sys

root = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else Path('target/jpackage-input').resolve()
errors=[]
required=[root/'DSE_Final.jar', root/'server'/'dse-erp-server.jar']
for p in required:
    if not p.is_file(): errors.append(f'missing file: {p}')
pg=root/'runtime'/'postgresql'
system=platform.system().lower()
win=system.startswith('win')
mac=system == 'darwin'
commands=[]
for name in ['initdb','pg_ctl','psql','createdb','postgres']:
    exe=pg/'bin'/(name+'.exe' if win else name)
    commands.append(exe)
    if not exe.is_file(): errors.append(f'missing PostgreSQL command: {exe}')
manifest=root/'runtime'/'runtime-manifest.properties'
if not manifest.is_file(): errors.append(f'missing runtime manifest: {manifest}')

# initdb --version is not sufficient: Homebrew can execute the binary while a real
# initialization still fails because its compiled pkgshare points back to the build Mac.
# Find the bundled postgres.bki directory and later perform a real throw-away initdb.
pg_share=None
share_root=pg/'share'
if share_root.is_dir():
    preferred=[share_root/'postgresql@18', share_root]
    for candidate in preferred:
        if (candidate/'postgres.bki').is_file():
            pg_share=candidate
            break
    if pg_share is None:
        pg_share=next((item.parent for item in share_root.rglob('postgres.bki') if item.is_file()), None)
if pg_share is None:
    errors.append(f'missing PostgreSQL bootstrap file postgres.bki under: {share_root}')

# A file-presence check is not enough for native runtimes. On the target build OS,
# execute every command that DSE ERP needs so missing DLL/dylib dependencies fail CI.
if not errors:
    env=os.environ.copy()
    if win:
        env['PATH']=str(pg/'bin')+os.pathsep+env.get('PATH','')
    elif mac:
        # A production runtime must work from its Mach-O load commands alone.
        # DYLD fallbacks can hide unresolved @rpath/build-machine dependencies on CI
        # that later fail when the app is launched normally from Finder.
        env.pop('DYLD_LIBRARY_PATH', None)
        env.pop('DYLD_FALLBACK_LIBRARY_PATH', None)
    for exe in commands:
        try:
            result=subprocess.run([str(exe),'--version'], env=env, text=True,
                                  stdout=subprocess.PIPE, stderr=subprocess.STDOUT, timeout=15)
            if result.returncode != 0:
                errors.append(f'PostgreSQL command cannot execute: {exe} (exit {result.returncode}): {result.stdout.strip()}')
        except Exception as exc:
            errors.append(f'PostgreSQL command cannot execute: {exe}: {exc}')

# Exercise the exact backend operation initdb uses while choosing max_connections and
# shared_buffers. The customer failure that printed 20/400kB indicates those backend
# probes were unhealthy even though initdb itself could start.
if not errors:
    postgres=pg/'bin'/('postgres.exe' if win else 'postgres')
    try:
        result=subprocess.run([str(postgres),'--check','-D',str(pg),
                               '-c','max_connections=40','-c','shared_buffers=64MB',
                               '-c','dynamic_shared_memory_type=posix'],
                              env=env, text=True, encoding='utf-8', errors='replace',
                              stdout=subprocess.PIPE, stderr=subprocess.STDOUT, timeout=20)
        # --check needs a real PGDATA to fully validate settings; exit 0/1 are both
        # acceptable here as long as the process reached PostgreSQL rather than dyld.
        out=result.stdout or ''
        if mac and ('dyld[' in out or 'Library not loaded:' in out or result.returncode < 0):
            errors.append(f'PostgreSQL backend loader probe failed (exit {result.returncode}): {out.strip()}')
    except Exception as exc:
        errors.append(f'PostgreSQL backend loader probe failed: {exc}')

# Perform the exact first-workspace initialization path used by ManagedPostgresRuntime.
# This deliberately uses SCRAM, a pwfile, normal fsync, UTF-8, locale C and the bundled
# -L bootstrap directory. A release must prove this full operation works from the staged
# runtime; initdb --version (or a trust/no-sync shortcut) is not a sufficient smoke test.
if not errors and pg_share is not None:
    import tempfile
    import shutil
    import secrets
    temp_parent=Path(tempfile.mkdtemp(prefix='dse-pg-verify-'))
    cluster=temp_parent/'data'
    pwfile=temp_parent/'owner.pwd'
    try:
        pwfile.write_text(secrets.token_urlsafe(30) + '\n', encoding='utf-8')
        try:
            os.chmod(pwfile, 0o600)
        except OSError:
            pass
        initdb=pg/'bin'/('initdb.exe' if win else 'initdb')
        command=[str(initdb), '-D', str(cluster), '-L', str(pg_share),
                 '-U', 'dse_erp_owner', '--pwfile=' + str(pwfile),
                 '--encoding=UTF8', '--locale=C',
                 '--auth-local=scram-sha-256', '--auth-host=scram-sha-256']
        result=subprocess.run(command, env=env, text=True, encoding='utf-8', errors='replace',
                              stdout=subprocess.PIPE, stderr=subprocess.STDOUT, timeout=120)
        output=result.stdout.strip()
        if result.returncode != 0 or not (cluster/'PG_VERSION').is_file():
            errors.append('PostgreSQL exact first-workspace initdb verification failed '
                          f'(exit {result.returncode}): {output}')
        else:
            print('Verified PostgreSQL exact first-workspace initdb path (SCRAM + pwfile + fsync).')
    except Exception as exc:
        errors.append(f'PostgreSQL exact first-workspace initdb verification failed: {exc}')
    finally:
        shutil.rmtree(temp_parent, ignore_errors=True)

def macho_rpaths(path):
    probe=subprocess.run(['otool','-l',str(path)], text=True, encoding='utf-8', errors='replace',
                         stdout=subprocess.PIPE, stderr=subprocess.PIPE)
    if probe.returncode != 0:
        return []
    lines=probe.stdout.splitlines()
    values=[]
    for i,line in enumerate(lines):
        if line.strip() != 'cmd LC_RPATH':
            continue
        for j in range(i+1, min(i+8, len(lines))):
            text=lines[j].strip()
            if text.startswith('path '):
                values.append(text[5:].split(' (offset ',1)[0].strip())
                break
    return values


def expand_special(base, owner, executable_dir):
    if base == '@loader_path': return owner.parent
    if base.startswith('@loader_path/'):
        return owner.parent/base[len('@loader_path/'):]
    if base == '@executable_path': return executable_dir
    if base.startswith('@executable_path/'):
        return executable_dir/base[len('@executable_path/'):]
    if base.startswith('/'):
        return Path(base)
    return None


def special_dependency_exists(owner, dep, pgroot):
    if dep.startswith('@loader_path/'):
        return (owner.parent/dep[len('@loader_path/'):]).resolve().exists()
    if dep.startswith('@executable_path/'):
        return (pgroot/'bin'/dep[len('@executable_path/'):]).resolve().exists()
    if dep.startswith('@rpath/'):
        rel=dep[len('@rpath/'):]
        for rp in macho_rpaths(owner):
            base=expand_special(rp, owner, pgroot/'bin')
            if base is not None and (base/rel).resolve().exists():
                return True
        for base in [pgroot/'lib', pgroot/'lib'/'postgresql', pgroot/'lib'/'dse-deps']:
            if (base/rel).resolve().exists():
                return True
        return False
    return True

# macOS release builds must never retain references to the Homebrew installation on
# the GitHub runner. This is the regression that caused initdb exit 134 on clean Macs.
if mac and pg.is_dir():
    forbidden=('/opt/homebrew/Cellar/','/usr/local/Cellar/','/opt/homebrew/opt/','/usr/local/opt/')
    for path in sorted(list((pg/'bin').glob('*')) + list((pg/'lib').rglob('*'))):
        if not path.is_file() or path.is_symlink():
            continue
        probe=subprocess.run(['file','-b',str(path)], text=True, encoding='utf-8', errors='replace', stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
        if 'Mach-O' not in probe.stdout:
            continue
        linked=subprocess.run(['otool','-L',str(path)], text=True, encoding='utf-8', errors='replace', stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        if linked.returncode != 0:
            errors.append(f'otool failed for {path}: {linked.stderr.strip()}')
            continue
        for line in linked.stdout.splitlines()[1:]:
            dep=line.strip().split(' (compatibility version',1)[0].strip()
            if dep.startswith(forbidden):
                errors.append(f'non-relocatable macOS dependency: {path.relative_to(pg)} -> {dep}')
            if dep.startswith(('@loader_path/','@executable_path/','@rpath/')):
                if not special_dependency_exists(path, dep, pg):
                    errors.append(f'broken bundled macOS dependency: {path.relative_to(pg)} -> {dep}')

if errors:
    print('DSE ERP production bundle verification FAILED', file=sys.stderr)
    for e in errors: print(' - '+e, file=sys.stderr)
    sys.exit(1)
print('DSE ERP production bundle verification PASS')
print(f'Bundle: {root}')
print(f'PostgreSQL: {pg}')
