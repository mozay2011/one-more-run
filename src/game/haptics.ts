/**
 * Haptic Vibration Feedback for Android & Mobile Devices
 */
export const haptics = {
  /**
   * Quick pulse on jump, slide, lane switch
   */
  light: () => {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(15);
      }
    } catch (_) {}
  },

  /**
   * Medium pulse on coin / powerup pickup
   */
  medium: () => {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(30);
      }
    } catch (_) {}
  },

  /**
   * Double pulse on powerup activate or high multiplier
   */
  double: () => {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([25, 30, 35]);
      }
    } catch (_) {}
  },

  /**
   * Heavy rumble on collision / game over
   */
  impact: () => {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([60, 40, 80]);
      }
    } catch (_) {}
  },
};
