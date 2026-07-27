"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import {
  Search,
  FileText,
  Clock,
  Check,
  AlertCircle,
  Brain,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { PageLoader } from "@/components/loading-states";

export default function Dashboard() {
  const { user } = useAuth();
  const router = useRouter();
  
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    completed: 0,
    documents: 0,
  });
  const [recentResearch, setRecentResearch] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");

  useEffect(() => {
    async function loadData() {
      try {
        const [history, docs] = await Promise.all([
          api.getResearchHistory(),
          api.getDocuments(),
        ]);
        
        setRecentResearch(history.items.slice(0, 5));
        
        const active = history.items.filter((r: any) => ["pending", "running"].includes(r.status)).length;
        const completed = history.items.filter((r: any) => r.status === "completed").length;
        
        setStats({
          total: history.items.length,
          active,
          completed,
          documents: docs.items.length,
        });
      } catch (error) {
        console.error("Failed to load dashboard data", error);
      } finally {
        setLoading(false);
      }
    }
    
    loadData();
  }, []);

  const handleQuickStart = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/research/new?q=${encodeURIComponent(query)}`);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return <Check className="w-4 h-4 text-success" />;
      case "running": return <Clock className="w-4 h-4 text-primary animate-pulse" />;
      case "failed": return <AlertCircle className="w-4 h-4 text-destructive" />;
      default: return <Clock className="w-4 h-4 text-warning" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const base = "px-2.5 py-0.5 rounded-full text-xs font-medium flex items-center gap-1.5 capitalize border";
    switch (status) {
      case "completed": return cn(base, "bg-success/10 text-success border-success/20");
      case "running": return cn(base, "bg-primary/10 text-primary border-primary/20");
      case "failed": return cn(base, "bg-destructive/10 text-destructive border-destructive/20");
      default: return cn(base, "bg-warning/10 text-warning border-warning/20");
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full animate-slide-up space-y-10">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
          Welcome back, <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-500">{user?.name || "Researcher"}</span>
        </h1>
        <p className="text-muted-foreground text-lg">What would you like to discover today?</p>
      </div>

      {/* Quick Start */}
      <form onSubmit={handleQuickStart} className="relative group max-w-3xl">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 blur-xl group-focus-within:blur-2xl transition-all rounded-2xl opacity-50"></div>
        <div className="relative bg-card/80 backdrop-blur-sm border border-border rounded-2xl shadow-lg flex items-center p-2 focus-within:ring-2 focus-within:ring-primary/50 transition-all">
          <Search className="w-6 h-6 text-muted-foreground ml-3" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask a question or enter a research topic..."
            className="flex-1 bg-transparent border-none focus:ring-0 text-lg px-4 py-3 placeholder:text-muted-foreground/60 outline-none"
          />
          <button
            type="submit"
            disabled={!query.trim()}
            className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-6 py-3 rounded-xl font-medium flex items-center gap-2 transition-all duration-200 hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
          >
            <Sparkles className="w-4 h-4" />
            Research
          </button>
        </div>
      </form>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Research", value: stats.total, icon: Brain, color: "text-indigo-400" },
          { label: "Active Tasks", value: stats.active, icon: Clock, color: "text-blue-400" },
          { label: "Completed", value: stats.completed, icon: Check, color: "text-emerald-400" },
          { label: "Documents", value: stats.documents, icon: FileText, color: "text-purple-400" },
        ].map((stat, i) => (
          <div key={i} className="bg-card/80 backdrop-blur-sm border border-border rounded-2xl p-6 flex flex-col gap-4 transition-all duration-200 hover:scale-[1.02] hover:bg-card">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground font-medium">{stat.label}</span>
              <stat.icon className={cn("w-5 h-5", stat.color)} />
            </div>
            <div className="text-3xl font-bold">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Recent Research */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Recent Research</h2>
          <Link href="/history" className="text-sm text-primary hover:underline flex items-center gap-1">
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        
        {recentResearch.length === 0 ? (
          <div className="text-center py-12 bg-card/50 backdrop-blur-sm border border-border border-dashed rounded-2xl text-muted-foreground">
            <Brain className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p className="text-lg">No research tasks yet.</p>
            <p className="text-sm">Start your first research by typing in the box above.</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {recentResearch.map((item) => (
              <Link key={item.id} href={`/research/${item.id}`}>
                <div className="group bg-card/80 backdrop-blur-sm border border-border rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-200 hover:scale-[1.01] hover:border-primary/30">
                  <div className="flex-1 space-y-1">
                    <h3 className="font-medium text-lg line-clamp-1 group-hover:text-primary transition-colors">{item.question}</h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      {formatDate(item.createdAt)} • {item.depth} depth
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={getStatusBadge(item.status)}>
                      {getStatusIcon(item.status)}
                      {item.status}
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
