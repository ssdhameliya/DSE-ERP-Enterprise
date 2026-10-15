/**
 * Jasvi Industries ERP - AudioSynthesizer
 * Web Audio API synthesizer matching desktop sound effects.
 * Includes intelligent throttling and volume-limiting to prevent loop audio spam.
 */
window.AudioSynthesizer = (function() {
  let audioCtx = null;
  let audioEnabled = true;
  let lastToneTime = 0;
  const THROTTLE_MS = 140; // Max 1 tone per 140ms to prevent loop stacking

  function initAudio() {
    try {
      if (!audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) audioCtx = new AudioContext();
      }
      if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
    } catch (_) {}
  }

  function shouldThrottle() {
    const now = Date.now();
    if (now - lastToneTime < THROTTLE_MS) {
      return true;
    }
    lastToneTime = now;
    return false;
  }

  return {
    toggle() {
      audioEnabled = !audioEnabled;
      return audioEnabled;
    },

    isEnabled() {
      return audioEnabled;
    },

    stopAll() {
      try {
        if (audioCtx && typeof audioCtx.close === 'function') {
          audioCtx.close();
          audioCtx = null;
        }
      } catch (_) {}
    },

    playNav() {
      if (!audioEnabled || shouldThrottle()) return;
      initAudio();
      if (!audioCtx) return;
      try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(520, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.025, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.08);
      } catch (_) {}
    },

    playSuccess() {
      if (!audioEnabled || shouldThrottle()) return;
      initAudio();
      if (!audioCtx) return;
      try {
        [587.33, 880, 1174.66].forEach((freq, idx) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, audioCtx.currentTime + idx * 0.06);
          gain.gain.setValueAtTime(0.035, audioCtx.currentTime + idx * 0.06);
          gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + idx * 0.06 + 0.12);
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start(audioCtx.currentTime + idx * 0.06);
          osc.stop(audioCtx.currentTime + idx * 0.06 + 0.12);
        });
      } catch (_) {}
    },

    playClose() {
      if (!audioEnabled || shouldThrottle()) return;
      initAudio();
      if (!audioCtx) return;
      try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(220, audioCtx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.025, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.08);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.08);
      } catch (_) {}
    },

    playError() {
      if (!audioEnabled || shouldThrottle()) return;
      initAudio();
      if (!audioCtx) return;
      try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(220, audioCtx.currentTime);
        osc.frequency.setValueAtTime(160, audioCtx.currentTime + 0.05);
        gain.gain.setValueAtTime(0.03, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.10);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.10);
      } catch (_) {}
    },

    playBarcodeBeep() {
      if (!audioEnabled || shouldThrottle()) return;
      initAudio();
      if (!audioCtx) return;
      try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(1760, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.06);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.06);
      } catch (_) {}
    },

    playKey() {
      if (!audioEnabled || shouldThrottle()) return;
      initAudio();
      if (!audioCtx) return;
      try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(660, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.02, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.04);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.04);
      } catch (_) {}
    }
  };
})();
