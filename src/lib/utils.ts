import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
const ADMIN_EMAILS = [
  "secretwars495@gmail.com", 
  "sahilsinghrajpoot45gmail.com" 
];
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
export function checkIsAdmin(email: string | null | undefined) {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email);
}