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

