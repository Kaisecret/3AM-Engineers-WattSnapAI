const tabs: [prefix: string, label: string][] = [["/bills/new", "Snap AI"], ["/bills", "Energy"], ["/appliances", "Appliances"], ["/advisories", "Advisories"], ["/assistant", "Assistant"], ["/dashboard", "Home"]];

/** The navigation tab a signed-in page belongs to, so it can be highlighted while the page loads. */
export function activeTab(pathname: string) {
  return tabs.find(([prefix]) => pathname === prefix || pathname.startsWith(`${prefix}/`))?.[1];
}
