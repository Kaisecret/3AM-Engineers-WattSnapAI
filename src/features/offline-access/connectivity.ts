/** The worker marks a cached navigation when the network fails despite an active interface. */
export function isDeviceOffline() {
  return (typeof navigator!=="undefined" && !navigator.onLine) || (typeof document!=="undefined" && document.documentElement.dataset.offlineShell==="true");
}
