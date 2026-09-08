/**
 * Audio and Haptic feedback utilities for Goodies Barcode Scanner
 */

export function playScanSound() {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;

    const audioCtx = new AudioContextClass();
    
    // Resume context if suspended (browser autoplay policy)
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    // High, cheerful two-tone beep (1760Hz -> 2093Hz)
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1760, audioCtx.currentTime); // A6
    osc.frequency.setValueAtTime(2093, audioCtx.currentTime + 0.04); // C7

    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.14);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.14);
  } catch (err) {
    // AudioContext blocked or not allowed; fail silently
    console.debug('Audio playback note:', err);
  }
}

export function triggerScanHaptic() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([40]);
    } catch {
      // ignore
    }
  }
}
