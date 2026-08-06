"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className, collapsed }: { className?: string; collapsed?: boolean }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  if (!mounted) {
    return <div className="w-9 h-9 rounded-md bg-secondary animate-pulse" />;
  }

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-colors group",
        collapsed && "justify-center px-0",
        className
      )}
      title={collapsed ? "Toggle theme" : undefined}
    >
      <div className="relative shrink-0 w-5 h-5 flex items-center justify-center group-hover:text-foreground">
        <Sun 
          size={20} 
          className={cn(
            "absolute transition-all duration-300",
            theme === "dark" ? "opacity-0 rotate-90 scale-50" : "opacity-100 rotate-0 scale-100"
          )} 
        />
        <Moon 
          size={20} 
          className={cn(
            "absolute transition-all duration-300",
            theme === "dark" ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-50"
          )} 
        />
      </div>
      {!collapsed && (
        <span className="font-medium truncate animate-fade-in text-left">
          {theme === "dark" ? "Light Mode" : "Dark Mode"}
        </span>
      )}
    </button>
  );
}
