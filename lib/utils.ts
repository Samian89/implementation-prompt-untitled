import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Shared className merger — reuse everywhere instead of string concat. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
