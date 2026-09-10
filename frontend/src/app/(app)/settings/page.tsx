"use client";

import React, { useState, useEffect } from "react";
import { Settings as SettingsIcon, Save, ExternalLink, Check } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";

export default function SettingsPage() {
  const { user } = useAuth();
  const [depth, setDepth] = useState("standard");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const savedDepth = localStorage.getItem("trove_default_depth");
    if (savedDepth) setDepth(savedDepth);
  }, []);

  const handleSave = () => {
    localStorage.setItem("trove_default_depth", depth);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="flex-1 p-6 md:p-10 max-w-4xl mx-auto w-full animate-slide-up space-y-8">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <SettingsIcon className="w-8 h-8 text-primary" />
          Settings
        </h1>
        <p className="text-muted-foreground mt-1">Configure your Trove experience.</p>
      </div>

      <div className="bg-card/80 backdrop-blur-sm border border-border rounded-3xl p-6 md:p-8 space-y-8 shadow-xl">
        
        {/* Section 1 */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold border-b border-border pb-2">LLM Configuration</h2>
          <div className="bg-background/50 border border-border rounded-2xl p-4 flex justify-between items-center">
            <div>
              <h3 className="font-medium">Primary Model</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Gemini 2.5 Flash / Llama 3 (Managed by backend)
              </p>
            </div>
            <div className="px-3 py-1 bg-secondary text-secondary-foreground rounded text-xs font-semibold tracking-wider">
              SYSTEM CONFIGURED
            </div>
          </div>
        </div>

        {/* Preferences */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold border-b border-border pb-2">Preferences</h2>
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="font-medium">Default Research Depth</h3>
              <p className="text-sm text-muted-foreground mt-1">
                How deeply agents investigate topics by default.
              </p>
            </div>
            <select 
              value={depth}
              onChange={(e) => setDepth(e.target.value)}
              className="w-full md:w-1/2 bg-background border border-border rounded-xl px-4 py-3 focus:ring-1 focus:ring-primary/50 focus:border-primary/50 outline-none transition-all appearance-none"
            >
              <option value="quick">Quick (1-3 sources)</option>
              <option value="standard">Standard (5-10 sources)</option>
              <option value="deep">Deep Dive (15+ sources)</option>
            </select>
          </div>
        </div>
        
        {/* Connected Accounts */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold border-b border-border pb-2">Connected Accounts</h2>
          <div className="space-y-3">
            <div className="bg-background/50 border border-border rounded-2xl p-4 flex justify-between items-center">
              <div>
                <h3 className="font-medium">Google Account</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {user?.google_id ? "Linked to your Google identity." : "Not connected."}
                </p>
              </div>
              {user?.google_id ? (
                <div className="px-3 py-1 bg-green-500/10 text-green-500 border border-green-500/20 rounded text-xs font-semibold tracking-wider flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> CONNECTED
                </div>
              ) : (
                <button 
                  onClick={() => window.location.href = api.getGoogleAuthUrl()}
                  className="px-4 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-lg text-sm font-medium transition-colors"
                >
                  Connect Google
                </button>
              )}
            </div>

            <div className="bg-background/50 border border-border rounded-2xl p-4 flex justify-between items-center">
              <div>
                <h3 className="font-medium">GitHub Account</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {user?.github_id ? "Linked to your GitHub identity." : "Not connected."}
                </p>
              </div>
              {user?.github_id ? (
                <div className="px-3 py-1 bg-green-500/10 text-green-500 border border-green-500/20 rounded text-xs font-semibold tracking-wider flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> CONNECTED
                </div>
              ) : (
                <button 
                  onClick={() => window.location.href = api.getGithubAuthUrl()}
                  className="px-4 py-2 bg-secondary hover:bg-secondary/80 text-secondary-foreground rounded-lg text-sm font-medium transition-colors"
                >
                  Connect GitHub
                </button>
              )}
            </div>
          </div>
        </div>
        
        {/* About */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold border-b border-border pb-2">About</h2>
          
          <div className="text-sm text-muted-foreground space-y-2">
            <p>Trove Multi-Agent Research Assistant v1.0.0</p>
          </div>
        </div>

        <div className="pt-6 border-t border-border flex justify-end">
          <button 
            onClick={handleSave}
            className="bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white px-8 py-3 rounded-xl font-medium flex items-center gap-2 transition-all duration-200 hover:scale-[1.02] shadow-lg shadow-primary/20"
          >
            {saved ? <><Check className="w-5 h-5" /> Saved</> : <><Save className="w-5 h-5" /> Save Changes</>}
          </button>
        </div>

      </div>
    </div>
  );
}


