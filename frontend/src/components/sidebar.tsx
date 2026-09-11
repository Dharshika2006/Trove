"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Home, Search, FileText, Clock, Settings, LogOut, ChevronLeft, ChevronRight, User } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./theme-toggle";

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "New Research", href: "/research/new", icon: Search },
  { name: "Documents", href: "/documents", icon: FileText },
  { name: "History", href: "/history", icon: Clock },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const [imgError, setImgError] = useState(false);
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside
      className={cn(
        "bg-card border-r border-border hidden md:flex flex-col h-screen sticky top-0 transition-all duration-300 z-40",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex items-center justify-between p-4 border-b border-border h-16">
        {!collapsed && (
          <Link href="/" className="flex items-center gap-2 overflow-hidden animate-fade-in hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg">
              T
            </div>
            <span className="font-semibold text-lg tracking-tight truncate">Trove</span>
          </Link>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            "p-1.5 rounded-md hover:bg-secondary text-muted-foreground transition-colors",
            collapsed && "mx-auto"
          )}
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group",
                isActive 
                  ? "bg-secondary text-foreground font-semibold" 
                  : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
              )}
              title={collapsed ? item.name : undefined}
            >
              <Icon size={20} className={cn("shrink-0", isActive ? "text-foreground" : "group-hover:text-foreground")} />
              {!collapsed && (
                <span className="font-medium truncate animate-fade-in">{item.name}</span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-border">
        {user ? (
          <div className="flex items-center gap-3 px-2 py-2 mb-2 rounded-lg bg-secondary/50">
            {user.avatar_url && !imgError ? (
              <img 
                src={user.avatar_url} 
                alt={user.name} 
                className="w-8 h-8 rounded-full shrink-0" 
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center shrink-0">
                <User size={16} className="text-accent" />
              </div>
            )}
            {!collapsed && (
              <div className="flex flex-col min-w-0 animate-fade-in">
                <span className="text-sm font-medium truncate">{user.name}</span>
                <span className="text-xs text-muted-foreground truncate">{user.email}</span>
              </div>
            )}
          </div>
        ) : (
          !collapsed && (
            <div className="px-2 py-2 mb-2 animate-fade-in text-sm text-muted-foreground">
              Not logged in
            </div>
          )
        )}
        <ThemeToggle collapsed={collapsed} />
        <button
          onClick={logout}
          className={cn(
            "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors group",
            collapsed && "justify-center px-0"
          )}
          title={collapsed ? "Logout" : undefined}
        >
          <LogOut size={20} className="shrink-0 group-hover:text-destructive" />
          {!collapsed && <span className="font-medium truncate animate-fade-in">Logout</span>}
        </button>
      </div>
    </aside>
  );
}
