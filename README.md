# TaskFlow AI — AI-Powered Task Management System

> A full-stack productivity application where every task is intelligently prioritized, summarized, and planned by AI.

[![Tests](https://img.shields.io/badge/tests-37%20passing-brightgreen)](#testing) [![Node](https://img.shields.io/badge/node-v18%2B-green)](https://nodejs.org) [![React](https://img.shields.io/badge/react-v19-61DAFB)](https://react.dev) [![License](https://img.shields.io/badge/license-ISC-blue)](#)

---

## Table of Contents

- [Project Overview](#project-overview)
- [Problem Statement](#problem-statement)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [AI Integration](#ai-integration)
- [Authentication](#authentication)
- [API Endpoints](#api-endpoints)
- [Database Design](#database-design)
- [Setup Instructions](#setup-instructions)
- [Environment Variables](#environment-variables)
- [Testing](#testing)
- [Future Enhancements](#future-enhancements)
- [Deployment](#deployment)

---

## Project Overview

**TaskFlow AI** is a modern, full-stack task management application that uses **Groq's Llama 3.3 70B** model to intelligently assist users with task prioritization, summarization, deadline estimation, and subtask generation. Users can authenticate via email/password or Google OAuth, manage their tasks with rich filtering and analytics, and get personalized AI productivity coaching.

---

## Problem Statement

Traditional task management tools treat all tasks equally. Users waste time manually assessing priority, breaking down complex tasks, and tracking deadlines. TaskFlow AI solves this by:

- **Automatically assigning priority** (High/Medium/Low) using AI when a task is created
- **Breaking complex tasks into subtasks** with one click
- **Suggesting realistic deadlines** based on task complexity
- **Providing personalized productivity coaching** based on actual task data
- **Enabling natural language task creation** — just describe your task in plain English

---

## Key Features

### Authentication
- ✅ Email/password registration & login (JWT)
- ✅ Google OAuth 2.0 (one-click sign in/sign up)
- ✅ Session-based auth persistence (sessionStorage — sessions expire on tab close)
- ✅ Protected routes
- ✅ GET /api/auth/me profile endpoint

### Task Management
- ✅ Full CRUD (Create, Read, Update, Delete)
- ✅ AI-generated priority on task creation (High/Medium/Low)
- ✅ Due dates, tags, estimated time (minutes)
- ✅ Subtasks (nested list, with completion tracking)
- ✅ Completion timestamp (`completedAt`) — auto-stamped when status → Completed
- ✅ Search (title + description, regex)
- ✅ Filter by status, priority, overdue, tag
- ✅ Sort by created date, due date, updated, title, priority
- ✅ Pagination (configurable limit, up to 100/page)

### AI Features (Groq — Llama 3.3 70B)
- ✅ **Priority generation** — auto-assigned on create
- ✅ **Task summary** — 1-2 sentence AI synopsis
- ✅ **Deadline suggestion** — Today / Tomorrow / Within 3 days / Within a week
- ✅ **Subtask breakdown** — 3-7 actionable steps
- ✅ **Productivity coach** — personalized tips based on real task stats
- ✅ **Natural language task creation** — describe → structured task

### Dashboard & Analytics
- ✅ Total / Pending / In Progress / Completed / Overdue counts
- ✅ Completion rate percentage
- ✅ Priority distribution (visual bars)
- ✅ Upcoming deadlines (next 7 days)
- ✅ AI productivity suggestions panel
- ✅ Natural language task creation panel

### Developer
- ✅ Swagger/OpenAPI docs at `/api/docs`
- ✅ Rate limiting (API: 200/15min, Auth: 20/15min, AI: 30/15min)
- ✅ CORS, Helmet security headers
- ✅ Structured logging (morgan + custom logger)
- ✅ Global error handling (Mongoose, JWT, validation errors)
- ✅ 37 passing tests (Jest + Supertest + MongoDB in-memory)

---

## Architecture

```
Task_Manager/
├── server/                    # Node.js + Express backend
│   └── src/
│       ├── ai/               # Groq client initialization
│       ├── config/           # DB connection, Swagger
│       ├── controllers/      # Request handlers (routes → controllers → services)
│       ├── middleware/       # Auth JWT, validation, error handler
│       ├── models/           # Mongoose schemas
│       ├── routes/           # Express routers with Swagger annotations
│       ├── services/         # Business logic layer
│       └── utils/            # asyncHandler, logger
└── client/                    # React + Vite frontend
    └── src/
        ├── api/              # Axios instance + interceptors
        ├── components/       # Navbar, TaskCard, TaskForm, ProtectedRoute
        ├── context/          # AuthContext (JWT + Google OAuth)
        ├── pages/            # Login, Register, Dashboard, NotFound
        └── services/         # authService, taskService (API calls)
```

### Request Flow
```
Browser → React → Axios (JWT header) → Express → Auth Middleware → Controller → Service → MongoDB
                                                                          ↓
                                                                    Groq AI (async)
```

---

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, Vite 8, React Router 7 |
| UI Library | MUI (Material UI) v9 |
| State Management | React Context API |
| HTTP Client | Axios with interceptors |
| Backend | Node.js, Express 5 |
| Database | MongoDB (Mongoose 9) |
| Authentication | JWT (jsonwebtoken), Google OAuth (google-auth-library) |
| AI Provider | Groq SDK (Llama 3.3 70B Versatile) |
| API Docs | Swagger/OpenAPI 3.0 (swagger-jsdoc + swagger-ui-express) |
| Security | Helmet, CORS, express-rate-limit, bcryptjs |
| Logging | Morgan (HTTP), custom structured logger |
| Testing | Jest 29, Supertest, mongodb-memory-server |
| Notifications | react-hot-toast |

---

## AI Integration

All AI features use **Groq's Llama 3.3 70B Versatile** model via the `groq-sdk`.

| Endpoint | Input | Output | Fallback |
|----------|-------|--------|----------|
| `POST /api/ai/prioritize` | title, description | "High" / "Medium" / "Low" | "Medium" |
| `POST /api/ai/summarize` | title, description | 1-2 sentence summary string | title: description |
| `POST /api/ai/deadline` | title, description | "Today" / "Tomorrow" / "Within 3 days" / "Within a week" | "Within a week" |
| `POST /api/ai/subtasks` | title, description | JSON array of 3-7 subtask strings | `[]` |
| `POST /api/ai/productivity` | (uses user's real task stats) | JSON array of 3-5 tip strings | `[]` |
| `POST /api/ai/natural-language` | free text description | `{title, description, priority, dueDate}` | 422 error |

**AI Safety:** All AI JSON output is validated and sanitized before being returned. Regex extraction handles cases where the model adds extra text around JSON. Enums are checked against allowed values. Character limits are enforced.

**Cost Control:** AI endpoints have a dedicated rate limiter (30 requests/15 minutes per IP). AI is only called when explicitly requested by the user (except priority generation on task create).

---

## Authentication

### Email/Password (JWT)
1. Register: `POST /api/auth/register` → returns JWT + user
2. Login: `POST /api/auth/login` → returns JWT + user
3. Token stored in `sessionStorage` (expires on tab close — by design)
4. All protected routes require `Authorization: Bearer <token>` header

### Google OAuth 2.0
1. Frontend uses `@react-oauth/google` to render Google's official button
2. Google returns a credential (ID token)
3. Frontend sends it to `POST /api/auth/google`
4. Backend verifies with `google-auth-library` (`OAuth2Client.verifyIdToken`)
5. User is found or created (email matching + account linking)
6. Same JWT is returned — same session system

### Session Behavior
- `sessionStorage` is used intentionally: users must log in each browser session
- Reopening a new tab → must re-authenticate
- Axios interceptors automatically redirect to `/login` on 401 responses

---

## API Endpoints

Full interactive documentation available at: **`http://localhost:8000/api/docs`**

### Auth
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | ❌ | Register with email/password |
| POST | `/api/auth/login` | ❌ | Login with email/password |
| POST | `/api/auth/google` | ❌ | Login/register with Google OAuth |
| GET | `/api/auth/me` | ✅ | Get current user profile |

### Tasks
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/tasks` | ✅ | Get tasks (pagination, search, filter, sort) |
| POST | `/api/tasks` | ✅ | Create task (AI priority auto-assigned) |
| PUT | `/api/tasks/:id` | ✅ | Update task |
| DELETE | `/api/tasks/:id` | ✅ | Delete task |
| GET | `/api/tasks/statistics` | ✅ | Dashboard analytics |

**Query params for GET /api/tasks:** `page`, `limit`, `search`, `status`, `priority`, `sort`, `order`, `tag`, `overdue`

### AI
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/ai/prioritize` | ✅ | Generate task priority |
| POST | `/api/ai/summarize` | ✅ | Generate task summary |
| POST | `/api/ai/deadline` | ✅ | Suggest deadline |
| POST | `/api/ai/subtasks` | ✅ | Break task into subtasks |
| POST | `/api/ai/productivity` | ✅ | Get personalized productivity tips |
| POST | `/api/ai/natural-language` | ✅ | Parse free text into task |

---

## Database Design

### User
```javascript
{
  name: String (required),
  email: String (required, unique, lowercase),
  password: String (optional — null for Google users, bcrypt hashed for local users),
  googleId: String (optional, sparse index),
  avatar: String (Google profile photo URL),
  authProvider: "local" | "google",
  createdAt, updatedAt (timestamps)
}
```

### Task
```javascript
{
  user: ObjectId (ref: User, indexed),
  title: String (required, max 120),
  description: String (required, max 2000),
  status: "Pending" | "In Progress" | "Completed",
  priority: "High" | "Medium" | "Low",
  dueDate: Date (optional),
  tags: [String] (max 10),
  estimatedTime: Number (minutes, 1-10080),
  completedAt: Date (auto-set when status → Completed),
  subtasks: [{ title: String, completed: Boolean }] (max 20),
  aiSummary: String (cached, max 500),
  createdAt, updatedAt (timestamps)
}
```

**Indexes:** `{ user: 1 }`, `{ user: 1, createdAt: -1 }`, `{ user: 1, status: 1 }`, `{ user: 1, dueDate: 1 }`, `{ user: 1, priority: 1 }`

---

## Setup Instructions

### Prerequisites
- Node.js v18+
- MongoDB Atlas account (or local MongoDB)
- Groq API key (free at [console.groq.com](https://console.groq.com))
- Google Cloud Console project (for OAuth)

### 1. Clone & Install

```bash
git clone <repository-url>
cd Task_Manager

# Install server dependencies
cd server && npm install

# Install client dependencies
cd ../client && npm install
```

### 2. Configure Environment Variables

**Server** (`server/.env`):
```env
NODE_ENV=development
PORT=8000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/task_manager
JWT_SECRET=your-long-random-secret-min-32-chars
GROQ_API_KEY=your-groq-api-key
CLIENT_ORIGIN=http://localhost:5173
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
API_URL=http://localhost:8000
```

**Client** (`client/.env`):
```env
VITE_API_BASE_URL=http://localhost:8000/api
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

### 3. Google OAuth Setup (Optional)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project → Enable "Google+ API" → Create OAuth 2.0 credentials
3. Add `http://localhost:5173` to Authorized JavaScript origins
4. Add your Client ID to both `.env` files
5. The Google login button will work automatically

### 4. Run the Application

```bash
# Terminal 1 — Backend
cd server && npm run dev

# Terminal 2 — Frontend
cd client && npm run dev
```

Open: http://localhost:5173

API Docs: http://localhost:8000/api/docs

---

## Environment Variables

| Variable | Location | Required | Description |
|----------|----------|----------|-------------|
| `NODE_ENV` | Server | No | `development` or `production` |
| `PORT` | Server | No | API server port (default: 8000) |
| `MONGODB_URI` | Server | **Yes** | MongoDB connection string |
| `JWT_SECRET` | Server | **Yes** | JWT signing secret (min 32 chars) |
| `GROQ_API_KEY` | Server | **Yes** | Groq API key for Llama model |
| `CLIENT_ORIGIN` | Server | No | Frontend URL for CORS (default: http://localhost:5173) |
| `GOOGLE_CLIENT_ID` | Server | No* | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Server | No* | Google OAuth client secret |
| `API_URL` | Server | No | Server base URL for Swagger docs |
| `VITE_API_BASE_URL` | Client | No | Backend API URL (default: http://localhost:8000/api) |
| `VITE_GOOGLE_CLIENT_ID` | Client | No* | Google OAuth client ID (public) |

*Required only if Google OAuth is desired. App works fully without it.

> ⚠️ **Never commit `.env` files.** Both are in `.gitignore`.

---

## Testing

```bash
cd server && npm test
```

**Test suites:** 4 | **Tests:** 37 | **Status:** All passing

| Suite | Tests | Coverage |
|-------|-------|----------|
| `auth.test.js` | 9 | Register, login, duplicate email, wrong password, validation, GET /me, auth protection |
| `tasks.test.js` | 13 | CRUD, tags, estimatedTime, filters, search, pagination, completedAt, statistics, isolation |
| `ai.test.js` | 1 | Priority endpoint (real Groq API integration test) |
| `ai.extended.test.js` | 14 | All 6 AI endpoints — validation errors + auth protection |

Tests use **mongodb-memory-server** (no real MongoDB needed for tests).

---

## Future Enhancements

- [ ] Real-time collaboration (WebSockets)
- [ ] Email/push notifications for overdue tasks
- [ ] Calendar view integration
- [ ] Task templates
- [ ] Team workspaces / shared task boards
- [ ] Dark mode toggle (CSS variables already prepared)
- [ ] Mobile app (React Native)
- [ ] CSV/PDF export
- [ ] Recurring tasks
- [ ] Time tracking integration

---

## Deployment

### Backend (e.g., Railway, Render, Fly.io)
```bash
cd server && npm start
```
Set all production environment variables. Set `NODE_ENV=production`.

### Frontend (e.g., Vercel, Netlify)
```bash
cd client && npm run build
# Deploy the dist/ directory
```
Set `VITE_API_BASE_URL` to your production backend URL.
Set `VITE_GOOGLE_CLIENT_ID` to your Google Client ID.
Add the production frontend URL to Google OAuth authorized origins.

### CORS
Update `CLIENT_ORIGIN` in server `.env` to your production frontend URL.

---

## License

ISC © TaskFlow AI
