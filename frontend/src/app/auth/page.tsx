"use client";

import React from "react";
import { api } from "@/lib/api";
import { Globe, Brain } from "lucide-react";

export default function AuthPage() {
  const handleGoogle = () => {
    window.location.href = api.getGoogleAuthUrl();
  };

  const handleGithub = () => {
    window.location.href = api.getGithubAuthUrl();
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden p-4">
      {/* Background elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/20 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-500/20 blur-[120px] pointer-events-none" />
      
      <div className="relative w-full max-w-md animate-slide-up">
        <div className="bg-card/40 backdrop-blur-xl border border-border rounded-3xl p-8 md:p-10 shadow-2xl shadow-black/50 text-center">
          
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg shadow-primary/30">
              <Brain className="w-10 h-10 text-white" />
            </div>
          </div>
          
          <h1 className="text-3xl font-bold tracking-tight mb-2">Welcome to Trove</h1>
          <p className="text-muted-foreground mb-8">Sign in to start your automated research journey.</p>
          
          <div className="space-y-4">
            <button 
              onClick={handleGoogle}
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-gray-900 px-4 py-3.5 rounded-xl font-medium transition-all duration-200 hover:scale-[1.02] shadow-sm"
            >
              <Globe className="w-5 h-5 text-blue-500" />
              Continue with Google
            </button>
            
            <button 
              onClick={handleGithub}
              className="w-full flex items-center justify-center gap-3 bg-[#24292F] hover:bg-[#24292F]/90 text-white px-4 py-3.5 rounded-xl font-medium transition-all duration-200 hover:scale-[1.02] shadow-sm"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor"><path d="M12 2A10 10 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.45-1.16-1.1-1.46-1.1-1.46-.92-.62.07-.6.07-.6 1.02.07 1.55 1.04 1.55 1.04.9 1.54 2.36 1.1 2.94.84.09-.65.35-1.1.64-1.35-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0 0 12 2Z" /></svg>
              Continue with GitHub
            </button>
          </div>

          <p className="mt-8 text-xs text-muted-foreground">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}
