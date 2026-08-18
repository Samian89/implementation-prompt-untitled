"use client";

import type { ReactNode } from "react";
import { GeneratedProviders } from "./registry.generated";

/** Wraps kernel-generated segment providers + local extensions. */
export function AppProviders({ children }: { children: ReactNode }) {
  return <GeneratedProviders>{children}</GeneratedProviders>;
}
