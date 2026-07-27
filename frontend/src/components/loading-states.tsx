import { cn } from "@/lib/utils";

export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn("animate-spin text-muted-foreground", className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      ></circle>
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      ></path>
    </svg>
  );
}

export function CardSkeleton() {
  return (
    <div className="glass rounded-xl p-6 shadow-sm border border-border animate-pulse">
      <div className="h-5 bg-secondary rounded-md w-1/3 mb-4"></div>
      <div className="space-y-3">
        <div className="h-4 bg-secondary rounded-md w-full"></div>
        <div className="h-4 bg-secondary rounded-md w-5/6"></div>
        <div className="h-4 bg-secondary rounded-md w-4/6"></div>
      </div>
      <div className="mt-6 flex justify-between">
        <div className="h-8 bg-secondary rounded-md w-24"></div>
        <div className="h-8 bg-secondary rounded-md w-24"></div>
      </div>
    </div>
  );
}

export function ReportSkeleton() {
  return (
    <div className="animate-pulse space-y-8">
      <div className="space-y-4">
        <div className="h-10 bg-secondary rounded-md w-3/4"></div>
        <div className="h-4 bg-secondary rounded-md w-1/4"></div>
      </div>
      
      <div className="space-y-4">
        <div className="h-6 bg-secondary rounded-md w-1/3 mb-6"></div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-4 bg-secondary rounded-md w-full"></div>
        ))}
        <div className="h-4 bg-secondary rounded-md w-4/5"></div>
      </div>
      
      <div className="space-y-4">
        <div className="h-6 bg-secondary rounded-md w-1/4 mb-6"></div>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-4 bg-secondary rounded-md w-full"></div>
        ))}
      </div>
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
      <div className="relative">
        <div className="w-16 h-16 rounded-xl bg-primary flex items-center justify-center text-primary-foreground text-3xl font-bold animate-pulse-glow shadow-[0_0_30px_rgba(99,102,241,0.5)]">
          T
        </div>
        <div className="absolute -inset-4 border border-primary/30 rounded-2xl animate-[spin_3s_linear_infinite]"></div>
        <div className="absolute -inset-8 border border-primary/10 rounded-3xl animate-[spin_4s_linear_infinite_reverse]"></div>
      </div>
      <h2 className="mt-12 text-xl font-medium tracking-wide animate-pulse">Initializing Trove...</h2>
    </div>
  );
}
