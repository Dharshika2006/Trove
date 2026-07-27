"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useResearchProgress } from "@/lib/websocket";
import { PageLoader, CardSkeleton } from "@/components/loading-states";
import { ConfidenceGauge } from "@/components/confidence-gauge";
import { SourceCard } from "@/components/source-card";
import { 
  Check, 
  Clock, 
  AlertCircle, 
  Download, 
  Copy, 
  Brain, 
  Search, 
  FileText, 
  FileSearch, 
  BookOpen, 
  Shield 
} from "lucide-react";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const PIPELINE_AGENTS = [
  { id: "planner", name: "Planner Agent", icon: Brain },
  { id: "search", name: "Search Agent", icon: Search },
  { id: "document", name: "Document Analysis", icon: FileText },
  { id: "retriever", name: "Information Retriever", icon: FileSearch },
  { id: "summarizer", name: "Summarizer", icon: BookOpen },
  { id: "critic", name: "Critic", icon: Shield },
  { id: "generator", name: "Report Generator", icon: FileText },
];

export default function ResearchView() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();

  const [research, setResearch] = useState<any>(null);
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentStatus = research?.status || "pending";
  const isComplete = currentStatus === "completed";

  // Hook for websocket updates
  const { events } = useResearchProgress(id, isComplete);

  // Derive agent states from websocket events
  const agentStatesFromWs = events.reduce<Record<string, any>>((acc, event) => {
    if (event.agent_name) {
      acc[event.agent_name] = {
        status: event.status,
        elapsed_time: event.elapsed_time,
        error: event.error,
        preview_data: event.preview_data,
      };
    }
    return acc;
  }, {});

  const loadResearch = async () => {
    try {
      const data = await api.getResearch(id);
      setResearch(data);
      // If completed, also load the report
      if (data.status === "completed" && data.has_report && !reportData) {
        try {
          const rpt = await api.getReport(id);
          setReportData(rpt);
        } catch {
          // Report may not be ready yet
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to load research");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) loadResearch();
    
    // Polling fallback if websocket is not available or disconnected
    const interval = setInterval(loadResearch, 5000);
    return () => clearInterval(interval);
  }, [id]);

  // Merge websocket progress with fetched state
  const agentStates = Object.keys(agentStatesFromWs).length > 0 ? agentStatesFromWs : {};
  
  if (loading) return <PageLoader />;

  if (error || currentStatus === "failed") {
    return (
      <div className="flex-1 p-6 md:p-10 max-w-4xl mx-auto w-full animate-slide-up flex flex-col items-center justify-center min-h-[50vh]">
        <div className="bg-destructive/10 border border-destructive/20 p-8 rounded-3xl flex flex-col items-center text-center max-w-lg">
          <AlertCircle className="w-16 h-16 text-destructive mb-4" />
          <h2 className="text-2xl font-bold text-destructive mb-2">Research Failed</h2>
          <p className="text-destructive/80 mb-6">{error || research?.error || "An unexpected error occurred during the research process."}</p>
          <button 
            onClick={() => router.push('/research/new')}
            className="bg-destructive text-destructive-foreground px-6 py-2 rounded-xl font-medium hover:bg-destructive/90 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const handleCopy = () => {
    if (reportData) {
      navigator.clipboard.writeText(reportData.content);
    }
  };

  const handleDownload = () => {
    if (reportData) {
      const blob = new Blob([reportData.content], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `research-${id}.md`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="flex-1 p-6 md:p-10 max-w-5xl mx-auto w-full animate-slide-up space-y-8 pb-32">
      {/* Header Info */}
      <div className="space-y-4 pb-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className={cn(
            "px-3 py-1 rounded-full text-xs font-medium capitalize border",
            isComplete ? "bg-success/10 text-success border-success/20" : "bg-primary/10 text-primary border-primary/20 animate-pulse"
          )}>
            {currentStatus}
          </div>
          <div className="text-sm text-muted-foreground">{research?.depth} depth research</div>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold leading-tight">{research?.question}</h1>
      </div>

      {!isComplete ? (
        /* Progress View */
        <div className="bg-card/50 backdrop-blur-sm border border-border rounded-3xl p-6 md:p-10 shadow-xl max-w-2xl mx-auto">
          <h3 className="text-xl font-semibold mb-8 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            Research Pipeline Active
          </h3>
          
          <div className="space-y-8 relative before:absolute before:inset-0 before:ml-[1.125rem] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
            {PIPELINE_AGENTS.map((agent, index) => {
              const state = agentStates[agent.id];
              const agentStatus = state?.status || "waiting";
              
              return (
                <div key={agent.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-background bg-card shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-[0_0_0_2px_rgba(var(--primary),0.2)] z-10">
                    {agentStatus === "completed" ? (
                      <Check className="w-4 h-4 text-success" />
                    ) : agentStatus === "running" ? (
                      <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    ) : agentStatus === "error" ? (
                      <AlertCircle className="w-4 h-4 text-destructive" />
                    ) : (
                      <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                    )}
                  </div>
                  
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-card border border-border p-4 rounded-xl shadow-sm transition-all duration-300">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2 font-medium">
                        <agent.icon className="w-4 h-4 text-muted-foreground" />
                        {agent.name}
                      </div>
                      {state?.elapsedTime && <span className="text-xs text-muted-foreground">{state.elapsedTime}s</span>}
                    </div>
                    <div className="text-sm text-muted-foreground capitalize">
                      {agentStatus === "running" ? "Processing..." : agentStatus}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Completed View */
        <div className="space-y-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            {reportData?.confidence_score != null && <ConfidenceGauge score={reportData.confidence_score * 100} />}
            
            <div className="flex gap-3">
              <button onClick={handleCopy} className="flex items-center gap-2 px-4 py-2 bg-secondary text-secondary-foreground rounded-xl hover:bg-secondary/80 transition-colors">
                <Copy className="w-4 h-4" /> Copy
              </button>
              <button onClick={handleDownload} className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20">
                <Download className="w-4 h-4" /> Download
              </button>
            </div>
          </div>

          <article className="prose prose-invert prose-lg max-w-none bg-card/40 backdrop-blur-sm border border-border p-6 md:p-12 rounded-3xl shadow-xl">
            {reportData?.content ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {reportData.content}
              </ReactMarkdown>
            ) : (
              <CardSkeleton />
            )}
          </article>

          {reportData?.metadata_json?.sources && reportData.metadata_json.sources.length > 0 && (
            <div className="space-y-4 pt-8">
              <h3 className="text-2xl font-bold border-b border-border pb-2">Sources Referenced</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {reportData.metadata_json.sources.map((source: any, i: number) => (
                  <SourceCard key={i} title={source.title || "Source"} url={source.url || "#"} snippet={source.snippet || ""} type={source.type || "Web"} credibility={source.credibility || "medium"} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
