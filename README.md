<div align="center">

# 🔮 Trove

### Multi-Agent AI Research Assistant

*An AI-powered research platform where multiple specialized agents collaborate to deliver deep, evidence-based research reports with citations and confidence scores.*


</div>

---

## ✨ What is Trove?

Trove is a **production-quality multi-agent research assistant** — think *Perplexity AI meets NotebookLM*. Instead of sending a single prompt to an LLM, Trove orchestrates **7 specialized AI agents** that collaborate through a structured pipeline:

```
User Question → Planner → Search → Document → Retriever → Summarizer → Critic → Report
```

Each agent has a focused responsibility, producing a balanced, cited, and confidence-scored research report.

---

### 7 Specialized Agents

| Agent | Role | Output |
|-------|------|--------|
| **Planner** | Decomposes question into sub-tasks | Research plan with sub-questions |
| **Search** | Searches the web via Tavily | Ranked web sources with snippets |
| **Document** | Processes uploaded PDFs/DOCX/TXT/MD | Chunked and embedded document content |
| **Retriever** | Finds relevant chunks via vector search | Top-K relevant passages |
| **Summarizer** | Synthesizes evidence into findings | Structured summaries per sub-question |
| **Critic** | Identifies contradictions and gaps | Bias analysis + credibility assessment |
| **Report** | Generates the final research report | Markdown report with citations + confidence score |

---

## 🚀 Quick Start

### Prerequisites

- **Python 3.12+**
- **Node.js 20+**
- **At least one LLM API key** (OpenAI, Anthropic, Groq, or Gemini)
- **Tavily API key** (free at [tavily.com](https://tavily.com))

### 1. Clone and Configure

```bash
git clone https://github.com/your-username/trove.git
cd trove

# Copy environment template
cp .env.example .env

# Edit .env with your API keys
# Required: at least one LLM key + Tavily key
# Optional: Google/GitHub OAuth keys
```

### 2. Start the Backend

```bash
cd backend

# Create virtual environment
python -m venv .venv
source .venv/bin/activate   # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start the server
uvicorn app.main:app --reload --port 8000
```

The API will be available at `http://localhost:8000` with interactive docs at `/docs`.

### 3. Start the Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start dev server
npm run dev
```

The app will be available at `http://localhost:3000`.

### 4. (Alternative) Docker Compose

```bash
# From the project root
docker compose up --build
```

This starts both services with persistent volumes for data and uploads.

---

## 🔐 Authentication

Trove supports **Google OAuth** and **GitHub OAuth** for authentication:

1. **Google**: Create credentials at [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   - Authorized redirect URI: `http://localhost:8000/auth/google/callback`
   
2. **GitHub**: Create an OAuth App at [GitHub Developer Settings](https://github.com/settings/developers)
   - Authorization callback URL: `http://localhost:8000/auth/github/callback`

Add your client IDs and secrets to `.env`.

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | FastAPI, Python 3.12, SQLAlchemy 2.0, aiosqlite |
| **Frontend** | Next.js 16, React 19, TypeScript, TailwindCSS v4 |
| **LLM** | LiteLLM (OpenAI, Anthropic, Groq, Gemini) |
| **Search** | Tavily API |
| **Vector DB** | ChromaDB (persistent) |
| **Database** | SQLite (async) |
| **Auth** | Google + GitHub OAuth, JWT sessions |
| **Deployment** | Docker, Docker Compose |

---


<div align="center">
  <p><strong>Built with 🔮 by Trove</strong></p>
  <p><em>Deep research. Multiple perspectives. Evidence-based answers.</em></p>
</div>
