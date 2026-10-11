/** Clear this project's browser credentials even when an expired session cannot refresh offline. */
export function clearLocalAuth(projectUrl: string) {
  const key = `sb-${new URL(projectUrl).hostname.split('.')[0]}-auth-token`;
  const belongs = (name: string) => name === key || name.startsWith(`${key}.`) || name.startsWith(`${key}-`);
  const cookieNames = () => document.cookie.split(';').map(value => value.trim().split('=')[0]).filter(belongs);
  for (const name of cookieNames()) document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
  for (const storage of [localStorage, sessionStorage]) {
    const names = Array.from({length:storage.length}, (_, index) => storage.key(index)).filter((name): name is string => !!name && belongs(name));
    for (const name of names) storage.removeItem(name);
  }
  if (cookieNames().length) throw new Error('Your browser could not finish local sign-out.');
}
