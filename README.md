# AI Ticket Workspace

A simple full-stack, AI-powered support-ticket management system. Users create tickets,
an LLM classifies them (category / priority / summary), and a dashboard visualizes
the workload with charts and filters.

## Stack

- **Frontend:** React + Vite + Tailwind CSS + Recharts + React Router
- **Backend:** FastAPI (Python) + SQLAlchemy
- **Database:** PostgreSQL
- **AI:** Anthropic Claude
- **Orchestration:** Docker Compose

## Class Diagram

<img width="992" height="640" alt="image" src="https://github.com/user-attachments/assets/e5d319d7-8930-4690-b8bb-73edf58e5203" />

## Architecture

<img width="467" height="480" alt="image" src="https://github.com/user-attachments/assets/f54a37b4-003e-485e-9fd7-cc5ddb65ea01" />

## Prerequisites

- Docker and Docker Compose
- An Anthropic API key

## Setup

```bash
# 1. Clone the repo
git clone https://github.com/PapiGelvez/SysdatecDevAssessment.git
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
- Backend API docs: http://localhost:8000/docs

Database tables are created automatically on backend startup.

## API Endpoints

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
3. The backend sends the ticket text to Claude with a prompt that
   forces only JSON responses:
   ```json
   { "category": "Finance|Legal|Procurement|Operations",
     "priority": "High|Medium|Low",
     "summary": "one sentence summary" }
   ```
4. The backend parses the JSON, validates the enum values, and saves a row in
   `ai_classifications`. Because the relationship is one-to-one, any existing
   classification for that ticket is **replaced**.
5. Category and priority then feed the dashboard pie charts via `/api/stats`.

## Authentication

Auth is intentionally minimal for this demo (no JWT):

- Passwords are stored as plain text (in production this would change).
- On login/signup the backend returns `{username, name}`.
- The frontend stores that object in React Context **and** `localStorage`
  (key `ticket_workspace_user`), so the session survives a page refresh.
- `PrivateRoute` redirects to `/login` when no user is present in context.
- Logout clears both context and `localStorage`.

## Claude Code

I used Claude Code for the creation of this app. After designing the Class Diagram and the browsing of the app (pages, routers, components), I gave Claude Coude the following prompt to create the app:

```
Build a full-stack AI-powered ticket management system from scratch.
Generate ALL files completely, no placeholders, no "add your logic here".

=== STACK ===
- Frontend: React + Vite + Tailwind CSS
- Backend: FastAPI (Python)
- Database: PostgreSQL
- Orchestration: Docker Compose

=== PROJECT STRUCTURE ===
/
├── docker-compose.yml
├── .env.example
├── README.md
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── context/
│       │   └── AuthContext.jsx      ← stores logged-in user in context + localStorage
│       ├── api/
│       │   └── client.js            ← axios instance pointing to /api
│       ├── pages/
│       │   ├── Login.jsx            ← login form
│       │   ├── Signup.jsx           ← signup form
│       │   ├── Dashboard.jsx        ← main dashboard
│       │   ├── CreateTicket.jsx     ← ticket creation form (full page)
│       │   └── TicketDetail.jsx     ← ticket detail view
│       └── components/
│           ├── PrivateRoute.jsx     ← redirects to /login if not authenticated
│           ├── Navbar.jsx           ← shows logged-in user + logout button
│           ├── TicketTable.jsx      ← filterable ticket list table
│           ├── CommentSection.jsx   ← comment list + add comment form
│           └── charts/
│               ├── StatusPieChart.jsx
│               ├── CategoryPieChart.jsx
│               └── PriorityPieChart.jsx
└── backend/
    ├── Dockerfile
    ├── requirements.txt
    └── app/
        ├── main.py
        ├── database.py
        ├── models.py
        ├── schemas.py
        ├── enums.py
        └── routers/
            ├── users.py
            ├── tickets.py
            └── comments.py

=== ENUMS ===
CATEGORY: Finance, Legal, Procurement, Operations
PRIORITY: High, Medium, Low
STATUS: Open, In Progress, Closed, Cancelled

=== DATABASE MODELS (SQLAlchemy) ===

User:
- username: String (PK)
- name: String
- password: String (store as plain text, no auth needed)

Ticket:
- id: UUID (PK, auto-generated)
- user_name: String (FK → User)
- text: String
- attachment_url: String (nullable)
- created_at: DateTime (auto)
- status: STATUS enum (default: Open)

AIClassification:
- id: UUID (PK, auto-generated)
- ticket_id: UUID (FK → Ticket, CASCADE DELETE, UNIQUE)
- category: CATEGORY enum
- summary: String
- priority: PRIORITY enum
- classified_at: DateTime (auto)

Comment:
- id: UUID (PK, auto-generated)
- ticket_id: UUID (FK → Ticket, CASCADE DELETE)
- author: String (FK → User)
- text: String
- created_at: DateTime (auto)

=== RELATIONSHIPS ===
- User → Ticket: one-to-many
- Ticket → AIClassification: one-to-one (composition, CASCADE DELETE)
- Ticket → Comment: one-to-many (composition, CASCADE DELETE)
- User → Comment: one-to-many

=== BACKEND ENDPOINTS ===

Users:
- POST /api/users → create user { username, name, password }
- POST /api/users/login → login { username, password } → returns user object
- GET /api/users → list all users (for dropdowns)

Tickets:
- POST /api/tickets → create ticket { user_name, text, attachment_url? }
- GET /api/tickets → list all tickets, include nested classification and comment_count
- GET /api/tickets/{id} → ticket detail with nested classification and all comments
- PATCH /api/tickets/{id} → update { status?, user_name? }

Classification:
- POST /api/tickets/{id}/classify → call Anthropic API, save or replace AIClassification

Comments:
- POST /api/tickets/{id}/comments → create comment { author, text }

Stats (for dashboard charts):
- GET /api/stats → returns:
  {
    "by_status": { "Open": 12, "In Progress": 5, "Closed": 8, "Cancelled": 2 },
    "by_category": { "Finance": 10, "Legal": 3, "Procurement": 7, "Operations": 7 },
    "by_priority": { "High": 8, "Medium": 10, "Low": 9 },
    "top_users": [
      { "username": "john", "name": "John Doe", "ticket_count": 15 },
      ...top 5 ordered by ticket_count desc
    ]
  }

=== AI CLASSIFICATION (Anthropic API) ===
Use anthropic Python SDK.
System prompt:
"You are a ticket classification assistant. Respond ONLY with a valid JSON object,
no markdown, no explanation."

User prompt:
"Classify this support ticket:
{ticket.text}

Respond with this exact JSON:
{
  "category": "Finance | Legal | Procurement | Operations",
  "priority": "High | Medium | Low",
  "summary": "one sentence summary of the ticket"
}"

Parse the JSON response and save to AIClassification table.
If a classification already exists for this ticket, replace it.

=== RESPONSE SHAPES ===

GET /api/tickets (list):
[{
  "id": "uuid",
  "user_name": "string",
  "text": "string",
  "attachment_url": "string | null",
  "status": "Open",
  "created_at": "datetime",
  "classification": {
    "category": "Finance",
    "priority": "High",
    "summary": "string",
    "classified_at": "datetime"
  } | null,
  "comment_count": 0
}]

GET /api/tickets/{id} (detail):
{
  ...same as list item,
  "comments": [{
    "id": "uuid",
    "author": "string",
    "author_name": "string",    ← join with User to get name
    "text": "string",
    "created_at": "datetime"
  }]
}

=== FRONTEND ROUTES ===
/ → redirect to /dashboard if logged in, else /login
/login → Login page
/signup → Signup page
/dashboard → Dashboard (protected)
/tickets/new → CreateTicket page (protected)
/tickets/:id → TicketDetail page (protected)

=== AUTH (simple, no JWT) ===
- AuthContext stores { username, name } in React context and localStorage
- On login: POST /api/users/login, if success store user in context
- On signup: POST /api/users, then auto-login and redirect to /dashboard
- Logout: clear context and localStorage, redirect to /login
- PrivateRoute: if no user in context → redirect to /login

=== LOGIN PAGE (/login) ===
- Fields: username, password
- "Login" button → POST /api/users/login
- On success → redirect to /dashboard
- Link to /signup

=== SIGNUP PAGE (/signup) ===
- Fields: username, name, full name, password
- "Sign Up" button → POST /api/users
- On success → auto login → redirect to /dashboard
- Link to /login

=== DASHBOARD PAGE (/dashboard) ===

Top section — 3 Pie Charts side by side (use recharts):
1. Tickets by Status: Open, In Progress, Closed, Cancelled
2. Tickets by Category: Finance, Legal, Procurement, Operations
3. Tickets by Priority: High, Medium, Low

Each pie chart must show percentage labels on slices.
Use distinct colors per slice. Show a legend below each chart.

Middle section:
- Top 5 users with most tickets created
  Displayed as a simple ranked list: rank, name, username, ticket count

Below that — Ticket Table:
- Columns: ID (first 8 chars), Owner, Status, Category, Priority, Summary, 
  Created At, Actions
- Filter bar above table with:
  - Dropdown: filter by Status (All, Open, In Progress, Closed, Cancelled)
  - Dropdown: filter by Category (All, Finance, Legal, Procurement, Operations)
  - Dropdown: filter by Priority (All, High, Medium, Low)
  - Date range picker: Created At from / to (two date inputs)
  - "Clear filters" button
- Filters apply client-side (filter the fetched tickets array)
- Each row is clickable → navigates to /tickets/:id
- "New Ticket" button at top right of table section → navigates to /tickets/new

=== CREATE TICKET PAGE (/tickets/new) ===
- Full page form (not modal)
- Fields:
  - Request text (textarea, required)
  - Attachment URL (text input, optional)
- Owner is automatically set to the logged-in user (user_name from AuthContext)
- "Create Ticket" button → POST /api/tickets → on success redirect to /dashboard
- "Cancel" button → back to /dashboard

=== TICKET DETAIL PAGE (/tickets/:id) ===

Top section:
- Show: Ticket ID, Owner, Created At, Status badge
- Show attachment URL as a clickable link if present

AI Classification section:
- If classification exists: show Category, Priority, Summary in a card
- If not classified: show "Not classified yet" message
- "Classify with AI" button (always visible) → POST /api/tickets/:id/classify
  → show loading state → refresh classification on success

Edit section:
- Status dropdown (Open, In Progress, Closed, Cancelled) — prefilled with current
- Owner dropdown (list of all users) — prefilled with current owner
- "Save changes" button → PATCH /api/tickets/:id

Comments section:
- List of all comments ordered by created_at ascending
- Each comment shows:
  - Author full name (name field from User)
  - Timestamp (formatted: "Jun 25, 2026 at 3:42 PM")
  - Comment text
- Add comment form at bottom:
  - Author is automatically the logged-in user (from AuthContext), shown as read-only
  - Textarea for comment text
  - "Add Comment" button → POST /api/tickets/:id/comments → refresh comments

=== DOCKER COMPOSE ===
Services:
- db: postgres:15, port 5432, persistent volume, env vars from .env
  healthcheck: pg_isready -U postgres
- backend: builds from ./backend, port 8000, depends_on db (condition: healthy)
  env vars: ANTHROPIC_API_KEY, DATABASE_URL
  command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
- frontend: builds from ./frontend, port 5173, depends_on backend
  command: npm run dev -- --host 0.0.0.0

=== .env.example ===
ANTHROPIC_API_KEY=your_anthropic_api_key_here
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=tickets_db
DATABASE_URL=postgresql://postgres:postgres@db:5432/tickets_db

=== BACKEND SETUP ===
requirements.txt:
fastapi, uvicorn, sqlalchemy, psycopg2-binary, anthropic, python-dotenv, pydantic

database.py:
- SQLAlchemy engine from DATABASE_URL env var
- SessionLocal, Base, get_db dependency
- Call Base.metadata.create_all(bind=engine) on startup

main.py:
- Include all routers with prefix /api
- CORSMiddleware: allow origins ["http://localhost:5173"], allow all methods and headers
- On startup event: create_all tables

=== FRONTEND SETUP ===
package.json dependencies:
react, react-dom, react-router-dom, axios, recharts, tailwindcss, 
@vitejs/plugin-react, autoprefixer, postcss

vite.config.js:
- Proxy /api requests to http://backend:8000
  (use http://localhost:8000 for local dev outside docker)

Tailwind: configure content paths, include in index.css

=== README.md ===
Include:
- Project overview
- ASCII architecture diagram
- Prerequisites: Docker + Docker Compose + Anthropic API key
- Setup steps: clone, cp .env.example .env, add API key, docker compose up --build
- List of all endpoints
- Explanation of AI classification flow
- Notes on simple auth (no JWT, localStorage based)

=== CRITICAL RULES ===
- Every single file must be complete and immediately runnable
- No TODOs, no placeholders, no "implement this later"
- docker compose up --build must work end to end on first run
- Database tables must be created automatically on backend startup
- All charts must render with real data from GET /api/stats
- Filters on dashboard must work client-side
- Comments must show author full name and formatted timestamp
- Auth must persist on page refresh (localStorage)
- All protected routes must redirect to /login if not authenticated
```

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

