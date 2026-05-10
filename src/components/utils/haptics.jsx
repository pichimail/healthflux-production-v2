/**
 * Haptic Feedback Utility — uses Vibration API (Android Chrome) + iOS fallback
 */
export const Haptics = {
  light:   () => { try { navigator.vibrate?.(8);               } catch(_){} },
  medium:  () => { try { navigator.vibrate?.(20);              } catch(_){} },
  heavy:   () => { try { navigator.vibrate?.(40);              } catch(_){} },
  success: () => { try { navigator.vibrate?.([10, 30, 15]);    } catch(_){} },
  error:   () => { try { navigator.vibrate?.([20,50,20,50,20]);} catch(_){} },
  warning: () => { try { navigator.vibrate?.([15, 30, 15]);    } catch(_){} },
  typing:  () => { try { navigator.vibrate?.(2);               } catch(_){} },
  swipe:   () => { try { navigator.vibrate?.(12);              } catch(_){} },
};
export default Haptics;