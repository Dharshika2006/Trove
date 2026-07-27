<div align="center">

# 🔮 Trove

### Multi-Agent AI Research Assistant

*An AI-powered research platform where multiple specialized agents collaborate to deliver deep, evidence-based research reports with citations and confidence scores.*

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Next.js-16+-000000?style=flat-square&logo=next.js)](https://nextjs.org/)
[![Python](https://img.shields.io/badge/Python-3.12+-3776AB?style=flat-square&logo=python)](https://python.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5+-3178C6?style=flat-square&logo=typescript)](https://typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)

</div>

---

## ✨ What is Trove?

Trove is a **production-quality multi-agent research assistant** — think *Perplexity AI meets NotebookLM*. Instead of sending a single prompt to an LLM, Trove orchestrates **7 specialized AI agents** that collaborate through a structured pipeline:

```
User Question → Planner → Search → Document → Retriever → Summarizer → Critic → Report
```

Each agent has a focused responsibility, producing a balanced, cited, and confidence-scored research report.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                     │
│  Dashboard │ Research │ Documents │ History │ Settings    │
│               WebSocket (real-time progress)             │
└─────────────────────┬───────────────────────────────────┘
                      │ REST API + WebSocket
┌─────────────────────┴───────────────────────────────────┐
│                   Backend (FastAPI)                       │
│  ┌─────────────────────────────────────────────────────┐ │
│  │              Research Orchestrator                   │ │
│  │  Planner → Search → Document → Retriever            │ │
│  │         → Summarizer → Critic → Report              │ │
│  └─────────────────────────────────────────────────────┘ │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐   │
│  │ SQLite   │  │ ChromaDB │  │ LiteLLM (Multi-LLM)  │   │
│  │ (Users,  │  │ (Vector  │  │ OpenAI, Gemini,      │   │
│  │ Research)│  │  Search)  │  │ Anthropic, Groq      │   │
│  └──────────┘  └──────────┘  └──────────────────────┘   │
│  ┌──────────┐  ┌──────────────────────────────────────┐  │
│  │ Tavily   │  │ OAuth (Google + GitHub)              │  │
│  │ (Search) │  │ JWT Session Tokens                   │  │
│  └──────────┘  └──────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

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

## 📁 Project Structure

```
trove/
├── .env.example                    # Environment template
├── docker-compose.yml              # Docker orchestration
│
├── backend/                        # FastAPI backend
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── main.py                 # FastAPI application entry
│       ├── schemas.py              # Pydantic request/response schemas
│       ├── core/
│       │   ├── config.py           # Settings (Pydantic BaseSettings)
│       │   ├── security.py         # JWT + OAuth setup
│       │   ├── llm.py              # LiteLLM wrapper (multi-provider)
│       │   ├── embeddings.py       # Embedding abstraction
│       │   └── vector_store.py     # ChromaDB vector store
│       ├── db/
│       │   ├── session.py          # SQLite async engine
│       │   └── models.py           # SQLAlchemy models
│       ├── api/
│       │   ├── deps.py             # FastAPI dependencies
│       │   ├── routes.py           # REST endpoints
│       │   └── websocket.py        # WebSocket for real-time progress
│       ├── agents/
│       │   ├── base.py             # BaseAgent abstract class
│       │   ├── models.py           # Shared agent I/O types
│       │   ├── planner.py          # Research planning agent
│       │   ├── search.py           # Web search agent (Tavily)
│       │   ├── document.py         # Document processing agent
│       │   ├── retriever.py        # Vector retrieval agent
│       │   ├── summarizer.py       # Evidence synthesis agent
│       │   ├── critic.py           # Contradiction detection agent
│       │   └── report.py           # Report generation agent
│       └── services/
│           ├── orchestrator.py     # Agent pipeline state machine
│           └── storage.py          # Local file storage
│
└── frontend/                       # Next.js frontend
    ├── Dockerfile
    ├── next.config.ts
    └── src/
        ├── lib/
        │   ├── api.ts              # Typed API client
        │   ├── auth.tsx            # Auth context + hooks
        │   ├── websocket.ts        # WebSocket hook
        │   └── utils.ts            # Utility functions
        ├── components/
        │   ├── sidebar.tsx         # Navigation sidebar
        │   ├── loading-states.tsx  # Skeleton loaders
        │   ├── confidence-gauge.tsx # SVG confidence meter
        │   ├── source-card.tsx     # Source citation card
        │   └── theme-toggle.tsx    # Dark/light toggle
        └── app/
            ├── globals.css         # Design system tokens
            ├── layout.tsx          # Root layout
            ├── page.tsx            # Dashboard
            ├── auth/
            │   ├── page.tsx        # OAuth login page
            │   └── callback/
            │       └── page.tsx    # OAuth callback handler
            ├── research/
            │   ├── new/
            │   │   └── page.tsx    # New research form
            │   └── [id]/
            │       └── page.tsx    # Research progress + report
            ├── documents/
            │   └── page.tsx        # Document library
            ├── history/
            │   └── page.tsx        # Research history
            └── settings/
                └── page.tsx        # Settings
```

---

## 🔧 Configuration

All configuration is done via environment variables (see `.env.example`):

| Variable | Required | Description |
|----------|----------|-------------|
| `DEFAULT_MODEL` | No | LLM model identifier (default: `openai/gpt-4o-mini`) |
| `OPENAI_API_KEY` | One of | OpenAI API key |
| `ANTHROPIC_API_KEY` | these | Anthropic API key |
| `GROQ_API_KEY` | four | Groq API key |
| `GEMINI_API_KEY` | keys | Google Gemini API key |
| `TAVILY_API_KEY` | Yes | Tavily search API key |
| `GOOGLE_CLIENT_ID` | No | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth secret |
| `GITHUB_CLIENT_ID` | No | GitHub OAuth client ID |
| `GITHUB_CLIENT_SECRET` | No | GitHub OAuth secret |
| `JWT_SECRET_KEY` | Yes | Secret for JWT tokens (change in prod!) |

---

## 🔌 API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check |
| `GET` | `/auth/google` | Initiate Google OAuth |
| `GET` | `/auth/github` | Initiate GitHub OAuth |
| `GET` | `/auth/me` | Get current user |
| `POST` | `/research/start` | Start new research |
| `GET` | `/research/{id}` | Get research status |
| `GET` | `/research/history/list` | Research history |
| `DELETE` | `/research/{id}` | Delete research |
| `POST` | `/documents/upload` | Upload document |
| `GET` | `/documents` | List documents |
| `DELETE` | `/documents/{id}` | Delete document |
| `GET` | `/reports/{research_id}` | Get research report |
| `WS` | `/ws/research/{id}` | Real-time progress |

Full interactive API docs available at `http://localhost:8000/docs`.

---

## 🧪 Research Depths

| Depth | Sources | Time | Best For |
|-------|---------|------|----------|
| **Quick** | 2–3 | ~30s | Simple factual questions |
| **Standard** | 5–10 | ~2 min | Balanced research |
| **Deep** | 15+ | ~5 min | Complex, multi-faceted topics |

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

## 📄 License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

---

<div align="center">
  <p><strong>Built with 🔮 by Trove</strong></p>
  <p><em>Deep research. Multiple perspectives. Evidence-based answers.</em></p>
</div>
