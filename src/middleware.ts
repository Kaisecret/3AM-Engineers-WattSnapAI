import type { NextRequest } from "next/server";
import { updateSession } from "./lib/supabase/middleware";
export async function middleware(request: NextRequest) { return updateSession(request); }
// Only pages that need an account. Public pages keep their normal caching and make no
// session request. Next.js needs these written out; a test keeps them equal to protectedRoots.
export const config = { matcher: ["/dashboard/:path*", "/setup/:path*", "/onboarding/:path*", "/bills/:path*", "/appliances/:path*", "/tips/:path*", "/settings/:path*", "/assistant/:path*", "/budget/:path*", "/brownout-ready/:path*", "/simulator/:path*", "/advisories/:path*", "/complete-profile/:path*"] };
