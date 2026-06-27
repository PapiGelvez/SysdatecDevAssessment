# 🎫 AI Ticket Workspace

A full-stack, AI-powered support-ticket management system. Users create tickets,
an LLM classifies them (category / priority / summary), and a dashboard visualizes
the workload with charts and filters.

## Stack

- **Frontend:** React + Vite + Tailwind CSS + Recharts + React Router
- **Backend:** FastAPI (Python) + SQLAlchemy
- **Database:** PostgreSQL
- **AI:** Anthropic Claude (via the official `anthropic` Python SDK)
- **Orchestration:** Docker Compose

## Architecture

```
                    ┌─────────────────────┐
                    │   Browser (React)   │
                    │   localhost:5173    │
                    └──────────┬──────────┘
                               │  /api/*  (Vite dev proxy)
                               ▼
                    ┌─────────────────────┐        ┌────────────────────┐
                    │   FastAPI backend   │  HTTPS │   Anthropic API    │
                    │   localhost:8000    │───────▶│   (classification) │
                    └──────────┬──────────┘        └────────────────────┘
                               │  SQLAlchemy
                               ▼
                    ┌─────────────────────┐
                    │   PostgreSQL 15     │
                    │   localhost:5432    │
                    └─────────────────────┘
```

## Prerequisites

- Docker & Docker Compose
- An Anthropic API key (https://console.anthropic.com/)

## Setup

```bash
# 1. Clone the repo
git clone <repo-url>
cd <repo>

# 2. Create your .env from the template
cp .env.example .env

# 3. Edit .env and set your real Anthropic API key
#    ANTHROPIC_API_KEY=sk-ant-...

# 4. Build and run everything
docker compose up --build
```

Then open:

- Frontend: http://localhost:5173
- Backend API docs (Swagger): http://localhost:8000/docs

Database tables are created automatically on backend startup — no migrations needed.

### Optional: choose the classification model

The backend defaults to `claude-haiku-4-5-20251001`. Override it by adding to `.env`
and passing it through in `docker-compose.yml` (`ANTHROPIC_MODEL`):

```
ANTHROPIC_MODEL=claude-sonnet-4-6
```

## API Endpoints

All endpoints are prefixed with `/api`.

### Users
| Method | Path               | Description                          |
|--------|--------------------|--------------------------------------|
| POST   | `/users`           | Create a user `{username,name,password}` |
| POST   | `/users/login`     | Login `{username,password}` → user   |
| GET    | `/users`           | List all users (for dropdowns)       |

### Tickets
| Method | Path                      | Description                                  |
|--------|---------------------------|----------------------------------------------|
| POST   | `/tickets`                | Create ticket `{user_name,text,attachment_url?}` |
| GET    | `/tickets`                | List tickets (+ classification + comment_count) |
| GET    | `/tickets/{id}`           | Ticket detail (+ classification + comments)  |
| PATCH  | `/tickets/{id}`           | Update `{status?,user_name?}`                |
| POST   | `/tickets/{id}/classify`  | Run AI classification (create or replace)    |

### Comments
| Method | Path                       | Description                       |
|--------|----------------------------|-----------------------------------|
| POST   | `/tickets/{id}/comments`   | Add comment `{author,text}`       |

### Stats
| Method | Path      | Description                                          |
|--------|-----------|------------------------------------------------------|
| GET    | `/stats`  | Counts by status/category/priority + top-5 users     |

## AI Classification Flow

1. The user opens a ticket and clicks **Classify with AI**.
2. The frontend calls `POST /api/tickets/{id}/classify`.
3. The backend sends the ticket text to Claude with a strict system prompt that
   forces a JSON-only response:
   ```json
   { "category": "Finance|Legal|Procurement|Operations",
     "priority": "High|Medium|Low",
     "summary": "one sentence summary" }
   ```
4. The backend parses the JSON, validates the enum values, and saves a row in
   `ai_classifications`. Because the relationship is one-to-one, any existing
   classification for that ticket is **replaced**.
5. Category and priority then feed the dashboard pie charts via `/api/stats`.

## Authentication (simple, no JWT)

Auth is intentionally minimal for this demo:

- Passwords are stored as plain text (do **not** use this in production).
- On login/signup the backend returns `{username, name}`.
- The frontend stores that object in React Context **and** `localStorage`
  (key `ticket_workspace_user`), so the session survives a page refresh.
- `PrivateRoute` redirects to `/login` when no user is present in context.
- Logout clears both context and `localStorage`.

## Project Structure

```
/
├── docker-compose.yml
├── .env.example
├── README.md
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── main.py          # FastAPI app, CORS, routers, table creation
│       ├── database.py      # engine, session, get_db dependency
│       ├── models.py        # SQLAlchemy models
│       ├── schemas.py       # Pydantic schemas
│       ├── enums.py         # CATEGORY / PRIORITY / STATUS
│       └── routers/
│           ├── users.py
│           ├── tickets.py   # tickets + classify + stats
│           └── comments.py
└── frontend/
    ├── Dockerfile
    ├── package.json
    ├── vite.config.js
    ├── index.html
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── context/AuthContext.jsx
        ├── api/client.js
        ├── pages/{Login,Signup,Dashboard,CreateTicket,TicketDetail}.jsx
        └── components/
            ├── PrivateRoute.jsx
            ├── Navbar.jsx
            ├── TicketTable.jsx
            ├── CommentSection.jsx
            └── charts/{Status,Category,Priority}PieChart.jsx
```

