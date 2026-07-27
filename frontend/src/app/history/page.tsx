"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { 
  History, 
  Check, 
  Clock, 
  AlertCircle,
  Search,
  ChevronDown,
  Trash2
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import { PageLoader } from "@/components/loading-states";

export default function HistoryPage() {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const loadHistory = async () => {
    try {
      const data = await api.getResearchHistory();
      setHistory(data.items);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Delete this research record?")) return;
    try {
      await api.deleteResearch(id);
      setHistory(prev => prev.filter(h => h.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const filteredHistory = history.filter(item => {
    if (filter !== "all" && item.status !== filter) return false;
    if (searchQuery && !item.question.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const getStatusBadge = (status: string) => {
    const base = "px-2.5 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 capitalize border w-fit";
    switch (status) {
      case "completed": return cn(base, "bg-success/10 text-success border-success/20");
      case "running": return cn(base, "bg-primary/10 text-primary border-primary/20");
      case "failed": return cn(base, "bg-destructive/10 text-destructive border-destructive/20");
      default: return cn(base, "bg-warning/10 text-warning border-warning/20");
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed": return <Check className="w-3.5 h-3.5" />;
      case "running": return <Clock className="w-3.5 h-3.5 animate-pulse" />;
      case "failed": return <AlertCircle className="w-3.5 h-3.5" />;
      default: return <Clock className="w-3.5 h-3.5" />;
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="flex-1 p-6 md:p-10 max-w-6xl mx-auto w-full animate-slide-up space-y-8">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <History className="w-8 h-8 text-primary" />
            Research History
          </h1>
          <p className="text-muted-foreground mt-1">Review and manage your past research sessions.</p>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-4 bg-card/50 backdrop-blur-sm border border-border p-4 rounded-2xl">
        <div className="relative flex-1">
          <Search className="w-5 h-5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search history..."
            className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-2 focus:ring-1 focus:ring-primary/50 focus:border-primary/50 outline-none transition-all"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0 hide-scrollbar">
          {["all", "completed", "running", "failed"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-medium capitalize whitespace-nowrap transition-all duration-200 border",
                filter === f 
                  ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20" 
                  : "bg-background border-border hover:bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {filteredHistory.length === 0 ? (
        <div className="text-center py-20 bg-card/30 backdrop-blur-sm border border-border border-dashed rounded-3xl text-muted-foreground">
          <History className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p className="text-lg">No research found.</p>
          {searchQuery && <p className="text-sm">Try adjusting your search filters.</p>}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredHistory.map((item) => (
            <Link key={item.id} href={`/research/${item.id}`} className="block group">
              <div className="bg-card/80 backdrop-blur-sm border border-border rounded-2xl p-5 flex flex-col md:flex-row md:items-center gap-5 transition-all duration-200 hover:scale-[1.01] hover:border-primary/40 hover:bg-card shadow-sm hover:shadow-md">
                
                <div className="flex-1 space-y-2">
                  <h3 className="font-semibold text-lg line-clamp-2 group-hover:text-primary transition-colors">
                    {item.question}
                  </h3>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <span>{formatDate(item.createdAt)}</span>
                    <span>•</span>
                    <span className="capitalize">{item.depth} Depth</span>
                    {item.confidence && (
                      <>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          Score: <span className={item.confidence > 80 ? "text-success" : item.confidence > 50 ? "text-warning" : "text-destructive"}>{item.confidence}%</span>
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 border-border pt-4 md:pt-0">
                  <div className={getStatusBadge(item.status)}>
                    {getStatusIcon(item.status)}
                    {item.status}
                  </div>
                  
                  <button 
                    onClick={(e) => handleDelete(item.id, e)}
                    className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </Link>
          ))}
          
          {/* Pagination Placeholder */}
          <div className="pt-6 flex justify-center">
            <button className="px-6 py-2.5 bg-secondary text-secondary-foreground rounded-xl text-sm font-medium hover:bg-secondary/80 transition-colors flex items-center gap-2">
              Load More <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
