"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { ArrowRight, Box, SlidersHorizontal, Search, CheckCircle2, Loader2, Network, Waypoints, Layers } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const Typewriter = ({ text, delay = 0 }: { text: string, delay?: number }) => {
  const [displayText, setDisplayText] = useState("");
  
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    
    // Initial delay
    const startDelay = setTimeout(() => {
      let currentIndex = 0;
      
      const interval = setInterval(() => {
        if (currentIndex <= text.length) {
          setDisplayText(text.slice(0, currentIndex));
          currentIndex++;
        } else {
          clearInterval(interval);
        }
      }, 30); // Typing speed
      
      return () => clearInterval(interval);
    }, delay * 1000);
    
    return () => {
      clearTimeout(startDelay);
    };
  }, [text, delay]);

  return (
    <span className="relative">
      {displayText}
      <motion.span 
        animate={{ opacity: [1, 0] }}
        transition={{ repeat: Infinity, duration: 0.8 }}
        className="inline-block w-[6px] h-[1em] bg-muted-foreground ml-[2px] align-middle"
      />
    </span>
  );
};

export default function LandingPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  // useEffect(() => {
  //   if (!isLoading && isAuthenticated) {
  //     router.push("/dashboard");
  //   }
  // }, [isAuthenticated, isLoading, router]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } }
  };

  const agentSteps = [
    { name: "Planner", status: "complete", delay: 1 },
    { name: "Search", status: "complete", delay: 2.5 },
    { name: "Synthesis", status: "running", delay: 4 }
  ];

  const [activeSteps, setActiveSteps] = useState(0);

  useEffect(() => {
    const timer1 = setTimeout(() => setActiveSteps(1), 1000);
    const timer2 = setTimeout(() => setActiveSteps(2), 2500);
    const timer3 = setTimeout(() => setActiveSteps(3), 4000);
    return () => { clearTimeout(timer1); clearTimeout(timer2); clearTimeout(timer3); };
  }, []);

  return (
    <div className="min-h-screen flex flex-col text-foreground font-sans selection:bg-primary/20">
      {/* Header */}
      <motion.header 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex items-center justify-between p-6 md:px-12 max-w-7xl mx-auto w-full"
      >
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 rounded bg-foreground flex items-center justify-center text-background font-bold text-lg">
            T
          </div>
          <span className="font-semibold text-lg tracking-tight">Trove</span>
        </Link>
        <nav>
          <Link 
            href={isAuthenticated ? "/dashboard" : "/auth"} 
            className="text-sm font-medium border border-border bg-secondary hover:bg-secondary/80 hover:border-border/80 transition-all px-4 py-2 rounded-full"
          >
            {isAuthenticated ? "Go to Dashboard" : "Get started"}
          </Link>
        </nav>
      </motion.header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center pt-24 md:pt-32 px-6 max-w-5xl mx-auto w-full text-center">
        
        {/* Hero Section */}
        <motion.div 
          className="mb-32 w-full flex flex-col items-center"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div variants={itemVariants} className="inline-block px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-sm font-medium mb-8">
            <span className="text-primary">Multi-agent research, built for depth</span>
          </motion.div>
          
          <motion.h1 variants={itemVariants} className="text-5xl md:text-[64px] font-bold tracking-tight text-foreground max-w-4xl mx-auto leading-[1.1] mb-6">
            A team of AI agents.<br className="hidden md:block"/> One research report.
          </motion.h1>

          <motion.p variants={itemVariants} className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
            A team of agents plans, searches, and writes your answer in the open — sources included, every time.
          </motion.p>

          <motion.div variants={itemVariants} className="flex flex-col items-center gap-4">
            <Link 
              href={isAuthenticated ? "/research/new" : "/auth"}
              className="inline-block bg-foreground text-background px-8 py-4 rounded-xl font-medium text-lg hover:bg-foreground/90 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-md"
            >
              Start researching — free
            </Link>
            <span className="text-muted-foreground text-sm">No credit card · 5 free research runs</span>
          </motion.div>
        </motion.div>

        {/* Stats Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.6 }}
          className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-3 gap-8 py-10 border-t border-b border-border/50 mb-24"
        >
          <div className="flex flex-col items-center">
            <span className="text-4xl font-bold text-foreground mb-2">4</span>
            <span className="text-muted-foreground text-sm">agents per run</span>
          </div>
          <div className="flex flex-col items-center md:border-l md:border-r border-border/50">
            <span className="text-4xl font-bold text-foreground mb-2">15+</span>
            <span className="text-muted-foreground text-sm">sources at deep depth</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-4xl font-bold text-foreground mb-2">100%</span>
            <span className="text-muted-foreground text-sm">steps visible</span>
          </div>
        </motion.div>

        {/* Graphic Area (Terminal) */}
        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="w-full max-w-4xl text-left mb-32"
        >
          <div className="bg-card border border-border rounded-2xl shadow-xl overflow-hidden">
            {/* Terminal Header */}
            <div className="bg-muted/50 border-b border-border px-4 py-3 flex gap-2">
              <div className="w-3 h-3 rounded-full bg-border"></div>
              <div className="w-3 h-3 rounded-full bg-border"></div>
              <div className="w-3 h-3 rounded-full bg-border"></div>
            </div>
            {/* Terminal Content */}
            <div className="p-6 md:p-8 flex flex-col md:flex-row gap-8">
              
              {/* Output Left Side */}
              <div className="flex-1 bg-muted/30 border border-border/50 rounded-xl p-6 shadow-sm">
                <h3 className="text-xl font-semibold mb-4 text-foreground">Trend of data analytics in the next 3 years</h3>
                <div className="text-muted-foreground leading-relaxed min-h-[100px]">
                  <Typewriter 
                    text="Automation and augmented analytics are consolidating BI workflows, while agentic pipelines are starting to replace static dashboards."
                    delay={1.5}
                  />
                </div>
              </div>

              {/* Agent Activity Right Side */}
              <div className="w-full md:w-[280px] bg-muted/30 border border-border/50 rounded-xl p-6 shadow-sm flex flex-col shrink-0">
                <h4 className="text-sm font-medium text-muted-foreground mb-4">Agent activity</h4>
                <div className="flex flex-col gap-4">
                  {agentSteps.map((step, index) => {
                    const isActive = activeSteps > index;
                    const isRunning = activeSteps === index + 1 && step.status === "running";
                    const isComplete = activeSteps > index && step.status === "complete";
                    
                    return (
                      <div key={step.name} className="flex items-center gap-3">
                        <div className="w-5 h-5 flex items-center justify-center">
                          {isComplete ? (
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-success">
                              <CheckCircle2 className="w-5 h-5" />
                            </motion.div>
                          ) : isRunning ? (
                            <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="text-primary">
                              <Loader2 className="w-5 h-5" />
                            </motion.div>
                          ) : (
                            <div className="w-5 h-5 rounded-full border-2 border-border" />
                          )}
                        </div>
                        <span className={`text-sm font-medium transition-colors duration-300 ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                          {step.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Features Grid */}
        <div className="w-full max-w-4xl text-left pb-32">
          <h2 className="text-xs font-bold tracking-widest text-muted-foreground uppercase mb-8">Why Trove</h2>
          
          <div className="flex flex-col gap-4">
            <FeatureCard 
              icon={<Network className="w-5 h-5 text-primary" />}
              title="Full transparency"
              description="Every agent step and source shown as it happens, not just the final answer."
              delay={0.1}
            />
            <FeatureCard 
              icon={<Waypoints className="w-5 h-5 text-primary" />}
              title="Depth on demand"
              description="Quick, standard, or deep — choose how many sources each run pulls in."
              delay={0.2}
            />
            <FeatureCard 
              icon={<Layers className="w-5 h-5 text-primary" />}
              title="One library"
              description="Every research run and uploaded document, searchable in one place."
              delay={0.3}
            />
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

function FeatureCard({ icon, title, description, delay }: { icon: React.ReactNode, title: string, description: string, delay: number }) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay }}
      className="bg-card border border-border rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center gap-6 hover:bg-secondary/50 transition-colors shadow-sm"
    >
      <div className="w-12 h-12 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
        {icon}
      </div>
      <div>
        <h3 className="text-lg font-semibold text-card-foreground mb-1">{title}</h3>
        <p className="text-muted-foreground">{description}</p>
      </div>
    </motion.div>
  );
}
