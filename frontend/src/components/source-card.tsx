import { ExternalLink, Globe, BookOpen, Newspaper, Landmark, FileText } from "lucide-react";
import { cn, formatDate } from "@/lib/utils";

type SourceType = "Web" | "Academic" | "News" | "Government" | "Document";

interface SourceCardProps {
  title: string;
  url: string;
  snippet: string;
  type: SourceType;
  credibility: "high" | "medium" | "low";
  publishedDate?: string;
  className?: string;
}

const typeConfig = {
  Web: { icon: Globe, color: "bg-zinc-500/20 text-zinc-400 border-zinc-500/30" },
  Academic: { icon: BookOpen, color: "bg-purple-500/20 text-purple-400 border-purple-500/30" },
  News: { icon: Newspaper, color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  Government: { icon: Landmark, color: "bg-green-500/20 text-green-400 border-green-500/30" },
  Document: { icon: FileText, color: "bg-amber-500/20 text-amber-400 border-amber-500/30" },
};

const credibilityColors = {
  high: "bg-success shadow-[0_0_8px_rgba(34,197,94,0.5)]",
  medium: "bg-warning shadow-[0_0_8px_rgba(234,179,8,0.5)]",
  low: "bg-destructive shadow-[0_0_8px_rgba(239,68,68,0.5)]",
};

export function SourceCard({
  title,
  url,
  snippet,
  type,
  credibility,
  publishedDate,
  className
}: SourceCardProps) {
  const config = typeConfig[type] || typeConfig.Web;
  const Icon = config.icon;
  
  let domain = url;
  try {
    const urlObj = new URL(url);
    domain = urlObj.hostname.replace("www.", "");
  } catch (e) {
    // Keep as is if invalid URL
  }

  return (
    <div className={cn(
      "glass rounded-xl p-5 border border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-[0_4px_20px_rgba(0,0,0,0.2)] group flex flex-col h-full",
      className
    )}>
      <div className="flex items-start justify-between gap-4 mb-3">
        <a 
          href={url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-lg font-medium leading-tight text-foreground hover:text-primary transition-colors flex-1 line-clamp-2"
        >
          {title}
        </a>
        <a 
          href={url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-muted-foreground hover:text-primary transition-colors p-1 rounded-md hover:bg-secondary shrink-0"
        >
          <ExternalLink size={18} />
        </a>
      </div>
      
      <p className="text-muted-foreground text-sm line-clamp-3 mb-4 flex-1">
        {snippet}
      </p>
      
      <div className="flex flex-wrap items-center gap-3 mt-auto pt-3 border-t border-border/50 text-xs">
        <div className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-full border font-medium", config.color)}>
          <Icon size={12} />
          {type}
        </div>
        
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Globe size={12} />
          <span className="truncate max-w-[120px]">{domain}</span>
        </div>
        
        <div className="flex items-center gap-1.5 ml-auto" title={`Credibility: ${credibility}`}>
          <div className={cn("w-2 h-2 rounded-full", credibilityColors[credibility])} />
        </div>
        
        {publishedDate && (
          <div className="text-muted-foreground">
            {formatDate(publishedDate)}
          </div>
        )}
      </div>
    </div>
  );
}
