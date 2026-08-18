import { NextResponse } from "next/server";
import { APP_NAME } from "@/lib/app-config.generated";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    // Public JSON: this is the app's own name, never the generator's.
    // Same resolution order as the header and <title> so a monitor and a
    // browser tab agree.
    service: process.env.NEXT_PUBLIC_APP_NAME || APP_NAME,
    // PROVIDES: scaffold.next15-app-router
    ts: new Date().toISOString()
  });
}
