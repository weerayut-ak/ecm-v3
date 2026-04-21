import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/supabase/middleware";

export async function middleware(request: NextRequest) {
  const response = await updateSession(request);

  // บอก Vercel Edge ให้ cache static assets นานขึ้น
  if (request.nextUrl.pathname.startsWith("/_next/static")) {
    response.headers.set("Cache-Control", "public, max-age=31536000, immutable");
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
