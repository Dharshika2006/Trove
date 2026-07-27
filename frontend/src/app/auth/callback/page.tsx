"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { PageLoader } from "@/components/loading-states";
import { AlertCircle } from "lucide-react";

function AuthCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setTokenAndLoad } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams?.get("token");
    
    if (token) {
      setTokenAndLoad(token)
        .then(() => {
          router.push("/");
        })
        .catch(() => {
          setError("Failed to authenticate with token.");
        });
    } else {
      setError("No authentication token provided.");
    }
  }, [searchParams, router, setTokenAndLoad]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="bg-destructive/10 border border-destructive/20 text-destructive p-6 rounded-2xl max-w-md w-full text-center flex flex-col items-center">
          <AlertCircle className="w-12 h-12 mb-4" />
          <h2 className="text-xl font-bold mb-2">Authentication Error</h2>
          <p className="mb-6 opacity-80">{error}</p>
          <button 
            onClick={() => router.push('/auth')}
            className="bg-destructive text-destructive-foreground px-6 py-2 rounded-xl font-medium"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center space-y-4">
      <PageLoader />
      <p className="text-muted-foreground animate-pulse">Completing sign in...</p>
    </div>
  );
}

export default function AuthCallback() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col items-center justify-center space-y-4">
        <PageLoader />
        <p className="text-muted-foreground animate-pulse">Loading...</p>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}
