import { NextResponse, type NextRequest } from "next/server";
import { allMiddlewareHooks } from "@/lib/middleware/hooks.generated";

export async function middleware(req: NextRequest) {
  for (const hook of allMiddlewareHooks) {
    const res = await hook(req);
    if (res) return res;
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
