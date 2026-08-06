"use client";

import React, { useState, useEffect, useMemo } from "react";
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
  { id: "report", name: "Report Generator", icon: FileText },
];

export default function ResearchView() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();

  const [research, setResearch] = useState<any>(null);
  const [reportData, setReportData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("section-0");
  const [isDownloading, setIsDownloading] = useState(false);

  const currentStatus = research?.status || "pending";
  const isComplete = currentStatus === "completed";

  // Hook for websocket updates
  const { events } = useResearchProgress(id, isComplete);

  // Derive agent states from websocket events
  let streamedReportContent = "";
  const agentStatesFromWs = events.reduce<Record<string, any>>((acc, event) => {
    if (event.type === "agent_stream" && event.agent_name === "report" && event.token) {
      streamedReportContent += event.token;
    }
    
    if (event.agent_name) {
      if (!acc[event.agent_name]) acc[event.agent_name] = {};
      
      if (event.status) acc[event.agent_name].status = event.status;
      if (event.elapsed_time !== undefined) acc[event.agent_name].elapsedTime = event.elapsed_time;
      if (event.error) acc[event.agent_name].error = event.error;
      if (event.preview_data) acc[event.agent_name].preview_data = event.preview_data;
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
  
  // Split markdown into sections
  const sections = useMemo(() => {
    if (!reportData?.content) return [];
    
    // Split by '## ' to get major sections
    const rawSections = reportData.content.split(/(?=^## )/m);
    
    return rawSections.map((section: string, idx: number) => {
      // Extract title from the first line
      const match = section.match(/^##\s+(.*)/);
      const title = match ? match[1].replace(/^\d+\.\s*/, '').trim() : (idx === 0 ? "Overview" : "Section");
      return {
        id: `section-${idx}`,
        title,
        content: section
      };
    }).filter((s: any) => s.content.trim().length > 0);
  }, [reportData?.content]);

  // Ensure active tab resets if it somehow gets out of bounds
  useEffect(() => {
    if (sections.length > 0 && !sections.find((s: any) => s.id === activeTab)) {
      setActiveTab(sections[0].id);
    }
  }, [sections, activeTab]);

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

  const handleDownload = async () => {
    if (!reportData?.content) return;
    
    setIsDownloading(true);
    try {
      const html2pdf = (await import('html2pdf.js')).default;
      const { marked } = await import('marked');
      const DOMPurify = (await import('dompurify')).default;

      // Parse markdown to HTML
      const htmlContent = await marked.parse(reportData.content);
      // Sanitize the HTML
      const cleanHtml = DOMPurify.sanitize(htmlContent)
        // Remove redundant [Research Report] citations that the AI sometimes inserts
        .replace(/\[Research Report\]/g, '')
        // Clean up any empty citations like [] or [ ]
        .replace(/\[\s*\]/g, '');

      // Create a temporary container
      const container = document.createElement('div');
      container.innerHTML = `
        <div style="font-family: Arial, sans-serif; padding: 40px; color: #111; line-height: 1.6;">
          <h1 style="border-bottom: 2px solid #eaeaea; padding-bottom: 10px; margin-bottom: 30px; font-size: 28px;">
            ${research?.question || "Research Report"}
          </h1>
          <div style="max-width: 100%; font-size: 14px;">
            ${cleanHtml}
          </div>
          <div style="margin-top: 50px; padding-top: 20px; border-top: 1px solid #eaeaea; color: #666; font-size: 12px; text-align: center;">
            Generated by Trove AI
          </div>
        </div>
      `;

      // Add basic styling for markdown elements in the PDF and fix page break slicing
      const style = document.createElement('style');
      style.innerHTML = `
        h2 { margin-top: 24px; margin-bottom: 16px; font-size: 20px; color: #000; page-break-after: avoid; break-after: avoid; }
        h3 { margin-top: 20px; margin-bottom: 12px; font-size: 16px; color: #222; page-break-after: avoid; break-after: avoid; }
        p { margin-bottom: 16px; page-break-inside: avoid; break-inside: avoid; }
        ul, ol { margin-bottom: 16px; padding-left: 24px; }
        li { margin-bottom: 8px; page-break-inside: avoid; break-inside: avoid; }
        a { color: #2563eb; text-decoration: none; }
        strong { color: #000; }
        blockquote { border-left: 4px solid #e5e7eb; padding-left: 16px; color: #4b5563; margin-left: 0; page-break-inside: avoid; break-inside: avoid; }
      `;
      container.appendChild(style);

      // Generate a clean filename from the research question
      const safeFilename = (research?.question || "research-report")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric chars with hyphens
        .replace(/(^-|-$)/g, '')     // Remove leading or trailing hyphens
        + '.pdf';

      // Configure html2pdf options
      const opt = {
        margin:       15,
        filename:     safeFilename,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2, useCORS: true },
        jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak:    { mode: ['css', 'legacy'] }
      };

      // Generate and save PDF
      await html2pdf().from(container).set(opt).save();
    } catch (err) {
      console.error("Failed to generate PDF:", err);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <>
      <div className="flex-1 p-6 md:p-10 max-w-5xl mx-auto w-full animate-slide-up space-y-8 pb-32">
      {/* Header Info */}
      <div className="space-y-4 pb-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className={cn(
            "px-3 py-1 rounded-full text-xs font-medium capitalize border",
            isComplete ? "bg-secondary text-foreground border-border" : "bg-background text-foreground border-foreground/30"
          )}>
            {currentStatus}
          </div>
          <div className="text-sm text-muted-foreground">{research?.depth} depth research</div>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold leading-tight">{research?.question}</h1>
      </div>

      {!isComplete ? (
        /* Progress View */
        <div className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-sm max-w-2xl mx-auto">
          <h3 className="text-xl font-semibold mb-8 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            Research Pipeline Active
          </h3>
          
          <div className="space-y-8 relative before:absolute before:inset-0 before:ml-[1.125rem] before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-border">
            {PIPELINE_AGENTS.map((agent, index) => {
              const state = agentStates[agent.id];
              const agentStatus = state?.status || "waiting";
              
              return (
                <div key={agent.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-background bg-card shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10">
                    {agentStatus === "completed" ? (
                      <Check className="w-4 h-4 text-success" />
                    ) : agentStatus === "running" ? (
                      <div className="w-2 h-2 rounded-full bg-foreground animate-pulse" />
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
                      {state?.elapsedTime && <span className="text-xs text-muted-foreground">{Number(state.elapsedTime).toFixed(1)}s</span>}
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
              <button 
                onClick={handleDownload} 
                disabled={isDownloading}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl transition-colors shadow-sm",
                  isDownloading 
                    ? "bg-primary/50 text-primary-foreground cursor-not-allowed" 
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                )}
              >
                {isDownloading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" /> 
                    Download PDF
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Tabs Navigation */}
          {sections.length > 0 ? (
            <div className="flex flex-col gap-6">
              <div className="flex flex-wrap gap-2 border-b border-border/50 pb-4">
                {sections.map((section: any) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveTab(section.id)}
                    className={cn(
                      "px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
                      activeTab === section.id 
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    )}
                  >
                    {section.title}
                  </button>
                ))}
              </div>
              
              <article className="prose prose-invert prose-lg md:prose-xl max-w-none bg-card border border-border p-6 md:p-12 rounded-3xl shadow-lg prose-headings:text-foreground prose-a:text-primary hover:prose-a:text-primary/80 prose-p:text-muted-foreground prose-p:leading-relaxed prose-li:text-muted-foreground prose-li:my-1 prose-strong:text-foreground prose-h1:mt-8 prose-h2:mt-0 prose-h2:mb-6 prose-h2:border-b prose-h2:border-border/50 prose-h2:pb-4 prose-h3:mt-8 prose-h3:text-foreground/90">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {sections.find((s: any) => s.id === activeTab)?.content || ""}
                </ReactMarkdown>
              </article>
            </div>
          ) : (
            <article className="prose prose-invert prose-lg md:prose-xl max-w-none bg-card border border-border p-6 md:p-12 rounded-3xl shadow-lg">
              <CardSkeleton />
            </article>
          )}

          {reportData?.metadata_json?.references && reportData.metadata_json.references.length > 0 && (
            <div className="space-y-4 pt-8">
              <h3 className="text-2xl font-bold border-b border-border pb-2">Sources Referenced</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {reportData.metadata_json.references.map((source: any, i: number) => (
                  <SourceCard key={i} title={source.title || "Source"} url={source.url || "#"} snippet={source.snippet || ""} type={source.type || "Web"} credibility={source.credibility || "medium"} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
    </>
  );
}
