"use client";

import React, { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import { 
  FileText, 
  Upload, 
  Trash2, 
  File, 
  FileImage, 
  FileCode,
  Download
} from "lucide-react";
import { cn, formatFileSize, formatDate } from "@/lib/utils";
import { PageLoader } from "@/components/loading-states";

export default function DocumentLibrary() {
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const loadDocs = async () => {
    try {
      const data = await api.getDocuments();
      setDocuments(data.items);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocs();
  }, []);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setIsDragging(true);
    else if (e.type === "dragleave") setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await handleUpload(Array.from(e.dataTransfer.files));
    }
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await handleUpload(Array.from(e.target.files));
    }
  };

  const handleUpload = async (files: File[]) => {
    setIsUploading(true);
    try {
      for (const file of files) {
        await api.uploadDocument(file);
      }
      await loadDocs();
    } catch (err) {
      console.error("Upload failed", err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return;
    try {
      await api.deleteDocument(id);
      setDocuments(prev => prev.filter(d => d.id !== id));
    } catch (err) {
      console.error("Delete failed", err);
    }
  };

  const getFileIcon = (type: string | undefined) => {
    if (!type) return <File className="w-8 h-8 text-muted-foreground" />;
    if (type.includes('pdf')) return <FileText className="w-8 h-8 text-red-400" />;
    if (type.includes('word') || type.includes('docx')) return <File className="w-8 h-8 text-blue-400" />;
    if (type.includes('markdown') || type.includes('md')) return <FileCode className="w-8 h-8 text-yellow-400" />;
    if (type.includes('image')) return <FileImage className="w-8 h-8 text-green-400" />;
    return <FileText className="w-8 h-8 text-muted-foreground" />;
  };

  if (loading) return <PageLoader />;

  return (
    <div className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full animate-slide-up space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Document Library</h1>
          <p className="text-muted-foreground mt-1">Manage files used for research context</p>
        </div>
      </div>

      {/* Upload Area */}
      <div 
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={cn(
          "border-2 border-dashed rounded-3xl p-10 text-center transition-all duration-200 flex flex-col items-center justify-center gap-4 bg-card/30 backdrop-blur-sm",
          isDragging ? "border-primary bg-primary/10 scale-[1.01]" : "border-border hover:bg-card/50",
          isUploading && "opacity-50 pointer-events-none"
        )}
      >
        <div className="p-4 bg-background rounded-full shadow-lg border border-border">
          {isUploading ? (
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          ) : (
            <Upload className="w-8 h-8 text-primary" />
          )}
        </div>
        <div>
          <p className="text-lg font-medium">{isUploading ? "Uploading..." : "Drag & drop files to upload"}</p>
          <p className="text-sm text-muted-foreground mt-1">Supports PDF, DOCX, TXT, MD</p>
        </div>
        <input 
          type="file" 
          multiple 
          onChange={handleFileChange}
          className="hidden" 
          id="doc-upload"
        />
        <label 
          htmlFor="doc-upload"
          className="mt-2 px-6 py-2 bg-secondary text-secondary-foreground rounded-xl text-sm font-medium cursor-pointer hover:bg-secondary/80 transition-colors shadow-sm"
        >
          Browse Files
        </label>
      </div>

      {/* Grid */}
      {documents.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>No documents found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {documents.map((doc) => (
            <div key={doc.id} className="group bg-card/80 backdrop-blur-sm border border-border rounded-2xl p-5 transition-all duration-200 hover:scale-[1.02] hover:border-primary/30 flex flex-col">
              <div className="flex items-start justify-between mb-4">
                <div className="p-3 bg-background rounded-xl shadow-sm border border-border/50">
                  {getFileIcon(doc.file_type)}
                </div>
                <div className="flex gap-2">
                  <button className="p-2 text-muted-foreground hover:text-primary transition-colors bg-background rounded-lg opacity-0 group-hover:opacity-100 shadow-sm border border-transparent group-hover:border-border">
                    <Download className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(doc.id)} className="p-2 text-muted-foreground hover:text-destructive transition-colors bg-background rounded-lg opacity-0 group-hover:opacity-100 shadow-sm border border-transparent group-hover:border-border">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <h3 className="font-semibold text-lg truncate mb-1" title={doc.filename}>{doc.filename}</h3>
              
              <div className="mt-auto pt-4 flex items-center justify-between text-xs text-muted-foreground border-t border-border/50">
                <span>{formatFileSize(doc.file_size)}</span>
                <span>{formatDate(doc.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
