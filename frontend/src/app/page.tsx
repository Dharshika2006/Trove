"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { ArrowRight, Box, SlidersHorizontal, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LandingPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push("/dashboard");
    }
  }, [isAuthenticated, isLoading, router]);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground font-sans">
      {/* Header */}
      <header className="flex items-center justify-between p-6 md:px-12 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg">
            T
          </div>
        </div>
        <nav>
          {isAuthenticated ? (
            <Link href="/dashboard" className="text-muted-foreground hover:text-foreground font-medium transition-colors">
              Go to Dashboard
            </Link>
          ) : (
            <Link href="/auth" className="text-muted-foreground hover:text-foreground font-medium transition-colors">
              Log in
            </Link>
          )}
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center pt-24 md:pt-32 px-6 max-w-5xl mx-auto w-full text-center">
        {/* Hero Section */}
        <div className="mb-8">
          <div className="inline-block px-4 py-1.5 rounded-full bg-secondary border border-border text-sm font-medium mb-8">
            <span className="text-blue-400">Multi-agent research, built for depth</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground max-w-4xl mx-auto leading-[1.15] mb-12">
            Ask a question. Watch a team of agents plan, search, and write the answer in real time — sources included.
          </h1>

          <Link 
            href={isAuthenticated ? "/research/new" : "/auth"}
            className="inline-block bg-primary text-primary-foreground px-8 py-4 rounded-xl font-medium text-lg hover:bg-primary/90 transition-colors shadow-sm"
          >
            Start researching
          </Link>
        </div>

        {/* Graphic Area */}
        <div className="w-full max-w-3xl mt-24 text-left">
          <div className="bg-card border border-border rounded-2xl shadow-xl overflow-hidden">
            {/* Terminal Header */}
            <div className="bg-secondary/50 border-b border-border px-4 py-3 flex gap-2">
              <div className="w-3 h-3 rounded-full bg-muted-foreground/30"></div>
              <div className="w-3 h-3 rounded-full bg-muted-foreground/30"></div>
              <div className="w-3 h-3 rounded-full bg-muted-foreground/30"></div>
            </div>
            {/* Terminal Content */}
            <div className="p-8">
              <h3 className="text-xl font-semibold mb-6">Trend of data analytics in the next 3 years</h3>
              
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2 text-emerald-500 font-medium text-sm">
                  <div className="w-4 h-4 border-2 border-emerald-500 rounded-sm"></div>
                  Planner
                </div>
                <div className="flex items-center gap-2 text-emerald-500 font-medium text-sm">
                  <div className="w-4 h-4 border-2 border-emerald-500 rounded-sm"></div>
                  Search
                </div>
                <div className="flex items-center gap-2 text-blue-400 font-medium text-sm">
                  <div className="w-4 h-4 border-2 border-blue-400 rounded-sm"></div>
                  Synthesis
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-left mt-32 mb-32">
          <div>
            <div className="mb-4">
              <Box className="w-6 h-6 text-foreground" />
            </div>
            <p className="text-muted-foreground leading-relaxed">
              See every agent step and source as it happens, not just the final answer.
            </p>
          </div>
          <div>
            <div className="mb-4">
              <SlidersHorizontal className="w-6 h-6 text-foreground" />
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Quick, standard, or deep — pick how many sources the run pulls in.
            </p>
          </div>
          <div>
            <div className="mb-4">
              <Search className="w-6 h-6 text-foreground" />
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Every research run and uploaded document, searchable in one place.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="flex items-center justify-between p-6 md:px-12 border-t border-border mt-auto w-full max-w-7xl mx-auto text-sm text-muted-foreground">
        <div>© 2026 Trove</div>
        <div className="flex gap-6">
          <Link href="#" className="hover:text-foreground transition-colors">Privacy</Link>
          <Link href="#" className="hover:text-foreground transition-colors">Terms</Link>
        </div>
      </footer>
    </div>
  );
}
