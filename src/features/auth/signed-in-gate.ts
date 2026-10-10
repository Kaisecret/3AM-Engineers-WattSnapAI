/**
 * Staying signed in. Supabase keeps the session in a cookie for 400 days and refreshes it,
 * so a person stays logged in until they log out. A person who is still signed in is sent
 * from the landing, login and sign-up pages straight back into the app, including when the
 * phone's Back button returns to those pages. Only routing uses this; every app page is still
 * checked on the server. This file has no browser imports so the root layout can use it.
 */
export const authCookie = /(?:^|;\s*)sb-[^=;]+-auth-token(?:\.\d+)?=/;
export const signedOutPages = ["/", "/login", "/signup"];
export const redirectGuardKey = "wattsnap-signed-in-redirect-v1";
export const redirectGuardMs = 10_000;

export const hasAuthCookie = (cookie: string) => authCookie.test(cookie);

/**
 * The only way back here from the app is the server sending someone to /login?next=… because it
 * could not confirm the session. Right after a redirect, that page then shows the form instead
 * of looping. The landing and sign-up pages are never a server redirect target.
 */
export const isServerBounce = (path: string, search: string) => path === "/login" && /[?&]next=/.test(search);

/** Inline check in the root layout: hides a signed-out page before it paints while a session cookie exists. */
export const signedInGateScript = `try{var p=location.pathname,q=location.search;if(${JSON.stringify(signedOutPages)}.indexOf(p)>-1&&!/[?&]error=/.test(q)&&${authCookie}.test(document.cookie)&&!(p==="/login"&&/[?&]next=/.test(q)&&Date.now()-Number(sessionStorage.getItem(${JSON.stringify(redirectGuardKey)})||0)<${redirectGuardMs})){document.documentElement.classList.add("ws-auth-check");setTimeout(function(){document.documentElement.classList.remove("ws-auth-check")},6000)}}catch(e){}`;
