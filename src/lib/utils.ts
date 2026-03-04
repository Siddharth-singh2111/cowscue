import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Single source of truth — import this everywhere, never redefine locally
export const ADMIN_EMAILS = [
  "secretwars495@gmail.com",
  "sahilsinghrajpoot45@gmail.com",
];

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function checkIsAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email);
}

export const SEVERITY_STYLES = {
  critical: "bg-red-600 text-white border-red-700",
  moderate: "bg-orange-500 text-white border-orange-600",
  routine: "bg-blue-500 text-white border-blue-600",
} as const;

export const STATUS_STYLES = {
  pending: "bg-red-100 text-red-700 border-red-200",
  assigned: "bg-yellow-100 text-yellow-700 border-yellow-200",
  resolved: "bg-green-100 text-green-700 border-green-200",
} as const;