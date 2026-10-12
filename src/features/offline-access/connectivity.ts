/** Current interface status; an online request still has to confirm server reachability. */
export function isNetworkOffline() {
  return typeof navigator !== "undefined" && !navigator.onLine;
}

/** The worker marks a cached navigation when the network fails despite an active interface. */
export function isDeviceOffline() {
  return isNetworkOffline() || (typeof document!=="undefined" && document.documentElement.dataset.offlineShell==="true");
}
