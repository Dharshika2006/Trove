import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date | undefined | null): string {
  if (!date) return "Unknown date";
  
  try {
    // If it's a sqlite naive string like "2023-10-10 12:00:00", replace space with T
    let parsedDate = date;
    if (typeof date === "string") {
      parsedDate = date.replace(" ", "T");
      // If the string lacks timezone info (Z, +, or - at the end), append Z to force UTC parsing
      if (!/(Z|[+-]\d{2}:?\d{2})$/.test(parsedDate)) {
        parsedDate += "Z";
      }
    }
    
    const d = new Date(parsedDate);
    if (isNaN(d.getTime())) return "Unknown date";
    
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(d);
  } catch (e) {
    return "Unknown date";
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function truncate(str: string, length: number): string {
  return str.length > length ? str.slice(0, length) + "..." : str;
}
