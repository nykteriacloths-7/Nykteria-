export type HapticPatternName =
  | 'tap'
  | 'select'
  | 'flip'
  | 'addToBag'
  | 'confirmOrder'
  | 'lock'
  | 'error';

const HAPTIC_PATTERNS: Record<HapticPatternName, number | number[]> = {
  tap: 8,
  select: [10, 18, 8],
  flip: [12, 22, 16],
  addToBag: [14, 28, 22, 16, 12],
  confirmOrder: [18, 36, 28, 26, 44],
  lock: [10, 18, 24],
  error: [22, 32, 22],
};

/**
 * Fires subtle tactile navigator.vibrate() waveforms on supported mobile/touch devices.
 * No-ops gracefully on unsupported desktop browsers or when vibration is restricted.
 */
export function triggerHaptic(pattern: HapticPatternName): void {
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') {
    return;
  }
  try {
    navigator.vibrate(HAPTIC_PATTERNS[pattern]);
  } catch {
    // Silently ignore if blocked by browser autoplay/gesture policy
  }
}
