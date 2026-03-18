import { logEvent } from "firebase/analytics";
import { analytics } from "../firebase/firebaseConfig";

export function trackEvent(name, params = {}) {
  if (!analytics) {
    return;
  }

  try {
    logEvent(analytics, name, params);
  } catch (error) {
    // Ignore analytics errors so product flows never fail on instrumentation.
  }
}
