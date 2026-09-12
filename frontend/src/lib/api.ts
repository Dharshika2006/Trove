const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

class ApiClient {
  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> || {}),
    };
    
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("access_token");
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }
    
    if (!(options.body instanceof FormData)) {
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
      credentials: "include", // Send cookies with every request
    });

    if (response.status === 401) {
      if (typeof window !== "undefined" && window.location.pathname !== "/" && !window.location.pathname.startsWith("/auth")) {
        window.location.href = "/auth";
      }
      throw new Error("Unauthorized");
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Request failed" }));
      throw new Error(error.detail || "Request failed");
    }

    return response.json();
  }
  
  async logout() {
    try {
      await this.request("/auth/logout", { method: "POST" });
    } catch (e) {
      // ignore
    }
  }

  // Auth
  async getMe() {
    return this.request<User>("/auth/me");
  }

  getGoogleAuthUrl() {
    return `${API_BASE}/auth/google`;
  }

  getGithubAuthUrl() {
    return `${API_BASE}/auth/github`;
  }

  // Research
  async startResearch(data: { question: string; depth: string; document_ids?: string[] }) {
    return this.request<Research>("/research/start", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getResearch(id: string) {
    return this.request<Research>(`/research/${id}`);
  }

  async getResearchHistory(skip = 0, limit = 20) {
    return this.request<{ items: Research[]; total: number }>(
      `/research/history/list?skip=${skip}&limit=${limit}`
    );
  }

  async deleteResearch(id: string) {
    return this.request(`/research/${id}`, { method: "DELETE" });
  }

  // Documents
  async uploadDocument(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    return this.request<Document>("/documents/upload", {
      method: "POST",
      body: formData,
    });
  }

  async getDocuments() {
    return this.request<{ items: Document[]; total: number }>("/documents");
  }

  async deleteDocument(id: string) {
    return this.request(`/documents/${id}`, { method: "DELETE" });
  }

  // Reports
  async getReport(researchId: string) {
    return this.request<Report>(`/reports/${researchId}`);
  }

  // Health
  async healthCheck() {
    return this.request<{ status: string }>("/health");
  }
}

export const api = new ApiClient();

// Types
export interface User {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  google_id: string | null;
  github_id: string | null;
  created_at: string;
}

export interface Research {
  id: string;
  question: string;
  status: string;
  depth: string;
  error_message: string | null;
  created_at: string;
  completed_at: string | null;
  has_report: boolean;
  confidence_score: number | null;
  coverage_score: number | null;
}

export interface Document {
  id: string;
  filename: string;
  file_type: string;
  file_size: number;
  chunk_count: number;
  created_at: string;
}

export interface ReportResponse {
  id: string;
  research_id: string;
  content: string;
  confidence_score: number;
  coverage_score: number;
  metadata_json?: any;
  created_at: string;
}

export interface Report {
  id: string;
  research_id: string;
  content: string;
  confidence_score: number;
  coverage_score: number;
  metadata_json: Record<string, any> | null;
  created_at: string;
}

export interface AgentProgress {
  type: string;
  agent_name: string;
  status: string;
  elapsed_time: number | null;
  preview_data: Record<string, any> | null;
  error: string | null;
  token?: string;
}
