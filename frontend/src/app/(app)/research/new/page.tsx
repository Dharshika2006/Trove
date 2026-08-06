"use client";

import React, { Suspense, useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { 
  Brain, 
  Search, 
  Zap, 
  Upload, 
  X, 
  FileText,
  AlertCircle,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";

const DEPTH_OPTIONS = [
  {
    id: "quick",
    title: "Quick",
    desc: "2-3 sources, ~30 seconds",
    icon: Zap,
  },
  {
    id: "standard",
    title: "Standard",
    desc: "5-10 sources, ~2 minutes",
    icon: Search,
  },
  {
    id: "deep",
    title: "Deep",
    desc: "15+ sources, ~5 minutes",
    icon: Brain,
  }
];

function NewResearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [question, setQuestion] = useState("");
  const [depth, setDepth] = useState("standard");
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = searchParams?.get("q");
    if (q) setQuestion(decodeURIComponent(q));
  }, [searchParams]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setIsDragging(true);
    else if (e.type === "dragleave") setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      const validFiles = droppedFiles.filter(f => 
        f.name.match(/\.(pdf|docx|txt|md)$/i)
      );
      setFiles(prev => [...prev, ...validFiles]);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...selectedFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!question.trim()) return;
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      const documentIds = [];
      for (const file of files) {
        const doc = await api.uploadDocument(file);
        documentIds.push(doc.id);
      }
      
      const research = await api.startResearch({
        question,
        depth,
        document_ids: documentIds
      });
      
      router.push(`/research/${research.id}`);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to start research");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 p-6 md:p-10 max-w-4xl mx-auto w-full animate-slide-up space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Sparkles className="w-8 h-8 text-primary" />
          New Research
        </h1>
        <p className="text-muted-foreground">Ask a question or describe what you want to learn about.</p>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      <div className="space-y-8 bg-card border border-border p-6 md:p-8 rounded-2xl shadow-sm">
        {/* Question Input */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-foreground ml-1">Research Question</label>
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="What would you like to research?"
            className="w-full h-32 bg-background border border-border focus:border-foreground focus:ring-1 focus:ring-foreground rounded-xl p-4 text-lg resize-none outline-none transition-all placeholder:text-muted-foreground/50"
          />
        </div>

        {/* Depth Selector */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-foreground ml-1">Research Depth</label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {DEPTH_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setDepth(opt.id)}
                className={cn(
                  "flex flex-col items-start p-4 rounded-2xl border text-left transition-all duration-200",
                  depth === opt.id 
                    ? `border-foreground bg-secondary/50 scale-[1.02]` 
                    : "border-border bg-background hover:border-muted-foreground/50"
                )}
              >
                <div className="p-2 rounded-xl mb-3 bg-secondary">
                  <opt.icon className="w-5 h-5 text-foreground" />
                </div>
                <div className="font-semibold">{opt.title}</div>
                <div className="text-xs text-muted-foreground mt-1">{opt.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* File Upload */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-foreground ml-1">Source Documents (Optional)</label>
          
          <div 
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={cn(
              "border-2 border-dashed rounded-2xl p-8 text-center transition-all flex flex-col items-center justify-center gap-4",
              isDragging ? "border-foreground bg-secondary/50" : "border-border bg-background hover:bg-secondary/30"
            )}
          >
            <div className="p-4 bg-card rounded-full shadow-sm">
              <Upload className="w-6 h-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium">Drag & drop files here, or click to select</p>
              <p className="text-xs text-muted-foreground mt-1">Supports PDF, DOCX, TXT, MD (Max 10MB)</p>
            </div>
            <input 
              type="file" 
              multiple 
              accept=".pdf,.docx,.txt,.md"
              onChange={handleFileChange}
              className="hidden" 
              id="file-upload"
            />
            <label 
              htmlFor="file-upload"
              className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg text-sm font-medium cursor-pointer hover:bg-secondary/80 transition-colors"
            >
              Browse Files
            </label>
          </div>

          {files.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {files.map((file, i) => (
                <div key={i} className="flex items-center gap-2 bg-card border border-border px-3 py-1.5 rounded-full text-sm">
                  <FileText className="w-4 h-4 text-primary" />
                  <span className="max-w-[150px] truncate">{file.name}</span>
                  <button onClick={() => removeFile(i)} className="text-muted-foreground hover:text-destructive transition-colors ml-1">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="pt-4 flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={!question.trim() || isSubmitting}
            className="w-full md:w-auto bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-50 shadow-sm"
          >
            {isSubmitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Starting Research...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Start Research
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function NewResearch() {
  return (
    <Suspense fallback={
      <div className="flex-1 p-6 md:p-10 max-w-4xl mx-auto w-full flex items-center justify-center min-h-[50vh]">
        <div className="text-muted-foreground animate-pulse">Loading...</div>
      </div>
    }>
      <NewResearchContent />
    </Suspense>
  );
}
