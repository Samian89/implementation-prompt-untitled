import type { NextRequest, NextResponse } from "next/server";
type MiddlewareHook = (req: NextRequest) => NextResponse | null | void | Promise<NextResponse | null | void>;
export const localHooks: MiddlewareHook[] = [];
