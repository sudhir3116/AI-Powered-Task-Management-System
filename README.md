# TaskFlow AI — AI-Powered Task Management System

> A production-ready, full-stack task management application where every task is intelligently prioritized, summarized, broken down, and planned by Groq AI (Llama 3.3 70B).

[![Tests](https://img.shields.io/badge/tests-42%20passing-brightgreen)](#testing) [![Node](https://img.shields.io/badge/node-v18%2B-green)](https://nodejs.org) [![React](https://img.shields.io/badge/react-v19-61DAFB)](https://react.dev) [![License](https://img.shields.io/badge/license-ISC-blue)](#)

---

## Table of Contents

1. [Project Title](#taskflow-ai--ai-powered-task-management-system)
2. [Project Overview](#project-overview)
3. [Problem Statement](#problem-statement)
4. [Objectives](#objectives)
5. [Features](#features)
6. [Architecture](#architecture)
7. [Technology Stack](#technology-stack)
8. [AI Integration](#ai-integration)
9. [Authentication](#authentication)
10. [Database Design](#database-design)
11. [API Overview](#api-overview)
12. [Environment Setup](#environment-setup)
13. [Installation](#installation)
14. [Running Frontend](#running-frontend)
15. [Running Backend](#running-backend)
16. [Testing](#testing)
17. [Screens & Features](#screens--features)
18. [Security Notes](#security-notes)
19. [Future Enhancements](#future-enhancements)

---

## Project Overview

**TaskFlow AI** is an enterprise-grade, full-stack productivity web application designed to help professionals and teams manage their workflows efficiently. Powered by **Groq's Llama 3.3 70B** large language model, TaskFlow AI automatically evaluates task urgency, generates actionable subtasks, summarizes complex task descriptions, and provides personalized AI productivity coaching based on real-time task analytics.

---

## Problem Statement

Modern productivity tools suffer from feature bloat, high manual friction, and a lack of intelligent assistance. Users spend valuable time manually prioritizing tasks, splitting large projects into steps, estimating deadlines, and sifting through cluttered interfaces. TaskFlow AI eliminates this friction by leveraging AI to structure, summarize, and prioritize tasks directly from plain English input while maintaining total data isolation between users.

---

## Objectives

- **Automate Task Structuring:** Transform natural language input into structured tasks with priority, due date, and subtasks.
- **Strict Data Isolation:** Guarantee that every user's data is isolated and accessible only to its authenticated owner.
- **Production-Ready Security:** Implement robust JWT verification, bcrypt password hashing, Google OAuth 2.0, rate limiting, and CORS headers.
- **Asynchronous Email Notifications:** Send first-time welcome emails and login security alerts via Resend/SMTP without blocking auth requests.
- **High-Performance SaaS UX:** Deliver a responsive, dense, 2-column SaaS dashboard displaying real-time analytics, workload metrics, and upcoming deadlines.

---

## Features

### Authentication & Security
- Email & password registration and login with bcrypt hashing.
- One-click Google OAuth 2.0 authentication.
- Secure JWT token issuing (`7d` expiration).
- Protected API routes enforcing Bearer token validation.
- Non-blocking welcome emails and login security alerts.
- Rate limiting on API, Auth, and AI endpoints.

### Task Management
- Complete CRUD operations (Create, Read, Update, Delete).
- Strict user data scoping (`req.user.id`).
- Task fields: Title, Description, Priority (`High`, `Medium`, `Low`), Status (`Pending`, `In Progress`, `Completed`), Due Date, Estimated Time, Tags, Subtasks, `completedAt` timestamp.
- Search (regex on title/description), Status filter, Priority filter, Tag filter, Overdue filter, and Sorting.
- Configurable pagination.

### AI Capabilities (Groq — Llama 3.3 70B)
- **Natural Language Task Creation:** Converts free text (e.g., *"Prepare for TCS assessment by Friday, high priority"*) into structured tasks.
- **Automated Priority Assignment:** Evaluates urgency and assigns `High`, `Medium`, or `Low`.
- **Subtask Breakdown:** Generates 3–5 clean, actionable, single-step subtasks.
- **Task Summarization:** Generates 1–2 sentence task synopses.
- **Deadline Suggestion:** Recommends target completion windows.
- **Productivity Coach:** Analyzes real-time statistics to output personalized productivity tips.

---

## Architecture

```
Task_Manager/
├── server/                    # Node.js + Express Backend
│   └── src/
│       ├── ai/               # Groq SDK Client
│       ├── config/           # Database Connection & Swagger Setup
│       ├── controllers/      # Request Controllers (Auth, Task, AI)
│       ├── middleware/       # Auth JWT, Validation, Error Handling
│       ├── models/           # Mongoose Models (User, Task)
│       ├── routes/           # Express API Routers
│       ├── services/         # Business Logic (Auth, Task, AI, Email)
│       └── utils/            # Logger, Async Handler
└── client/                    # React + Vite Frontend
    └── src/
        ├── api/              # Axios Client & Interceptors
        ├── components/       # Navbar, TaskCard, TaskForm, ProtectedRoute
        ├── context/          # AuthContext
        ├── pages/            # Login, Register, Dashboard, NotFound
        └── services/         # API Service Modules
```

### Authentication & Request Pipeline
```
React Client → Axios Interceptor (Bearer JWT) → Express Router → Rate Limiter → Auth Middleware → Controller → Service → MongoDB
                                                                                                      ↓
                                                                                                Groq / Resend API
```

---

## Technology Stack

| Layer | Technologies |
|-------|--------------|
| **Frontend** | React 19, Vite 8, React Router 7, Material UI (MUI) v9 |
| **Backend** | Node.js (v18+), Express 5 |
| **Database** | MongoDB Atlas, Mongoose 9 |
| **Authentication** | JWT (`jsonwebtoken`), Google OAuth (`google-auth-library`), `bcryptjs` |
| **AI Provider** | Groq SDK (`llama-3.3-70b-versatile`) |
| **Email Service** | Resend SDK (`resend`) / SMTP |
| **Documentation** | Swagger / OpenAPI 3.0 (`swagger-ui-express`) |
| **Testing** | Jest 29, Supertest, `mongodb-memory-server` |

---

## AI Integration

AI services interact with Groq's Llama 3.3 70B model using structured JSON prompts.

| Endpoint | Input Payload | Output Format |
|----------|---------------|---------------|
| `POST /api/ai/natural-language` | `{ text }` | `{ title, description, priority, dueDate, subtasks }` |
| `POST /api/ai/prioritize` | `{ title, description }` | `High` \| `Medium` \| `Low` |
| `POST /api/ai/subtasks` | `{ title, description }` | `["Subtask 1", "Subtask 2", ...]` (3–5 items) |
| `POST /api/ai/summarize` | `{ title, description }` | String (1–2 sentences) |
| `POST /api/ai/deadline` | `{ title, description }` | `Today` \| `Tomorrow` \| `Within 3 days` \| `Within a week` |
| `POST /api/ai/productivity` | None (reads user DB stats) | `["Tip 1", "Tip 2", ...]` |

**AI Fallbacks:** All AI outputs are validated and sanitized server-side. If the AI model is unavailable, default fallbacks ensure task creation and application execution never crash.

---

## Authentication

### Email & Password
- Registration (`POST /api/auth/register`) hashes passwords with `bcryptjs` (salt factor 10) and triggers an asynchronous Welcome Email.
- Login (`POST /api/auth/login`) verifies credentials and dispatches a Login Security Notification Email.

### Google OAuth 2.0
- Google Identity Services token is verified server-side via `OAuth2Client.verifyIdToken`.
- Finds existing user or creates a new user, dispatching a Welcome Email on first-time login.

---

## Database Design

### User Model (`users`)
```javascript
{
  name: String (required),
  email: String (required, unique, lowercase),
  password: String (nullable for Google users),
  googleId: String (sparse index),
  avatar: String,
  authProvider: "local" | "google",
  welcomeEmailSent: Boolean (default: false),
  createdAt, updatedAt: Date
}
```

### Task Model (`tasks`)
```javascript
{
  user: ObjectId (ref: "User", index: true, required: true),
  title: String (required, max 120),
  description: String (required, max 2000),
  status: "Pending" | "In Progress" | "Completed",
  priority: "High" | "Medium" | "Low",
  dueDate: Date,
  tags: [String] (max 10),
  estimatedTime: Number (minutes),
  completedAt: Date,
  subtasks: [{ title: String, completed: Boolean }],
  aiSummary: String,
  createdAt, updatedAt: Date
}
```

---

## API Overview

Interactive documentation is hosted at: `http://localhost:8000/api/docs`

| Method | Route | Description |
|--------|-------|-------------|
| **POST** | `/api/auth/register` | Register new local user account |
| **POST** | `/api/auth/login` | Authenticate local user |
| **POST** | `/api/auth/google` | Authenticate Google OAuth user |
| **GET** | `/api/auth/me` | Retrieve authenticated user profile |
| **GET** | `/api/tasks` | Get paginated tasks with search/filter/sort |
| **POST** | `/api/tasks` | Create task (AI priority auto-assigned) |
| **PUT** | `/api/tasks/:id` | Update task by ID |
| **DELETE** | `/api/tasks/:id` | Delete task by ID |
| **GET** | `/api/tasks/statistics` | Retrieve dashboard workload & completion analytics |

---

## Environment Setup

Create `.env` files in both `server/` and `client/` directories using the provided `.env.example` templates.

### Server Environment Variables (`server/.env`)
```env
NODE_ENV=development
PORT=8000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/task_manager
JWT_SECRET=your-32-character-random-jwt-secret
GROQ_API_KEY=your-groq-api-key
CLIENT_ORIGIN=http://localhost:5173
FRONTEND_URL=http://localhost:5173
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:8000/api/auth/google/callback
API_URL=http://localhost:8000
EMAIL_API_KEY=your-resend-api-key
EMAIL_FROM=TaskFlow AI <onboarding@resend.dev>
```

### Client Environment Variables (`client/.env`)
```env
VITE_API_BASE_URL=http://localhost:8000/api
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

---

## Installation

```bash
# Clone the repository
git clone <repository-url>
cd Task_Manager

# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

---

## Running Frontend

```bash
cd client
npm run dev
```
Access the application at `http://localhost:5173`.

---

## Running Backend

```bash
cd server
npm run dev
```
Access the API server at `http://localhost:8000` and Swagger docs at `http://localhost:8000/api/docs`.

---

## Testing

Backend test suites run in-memory using `mongodb-memory-server`.

```bash
cd server
npm test
```

**Test Coverage Summary:** 5 Test Suites, 42 Tests Passed (Auth, Task CRUD, User Data Isolation, AI Integration, Email Service).

---

## Screens & Features

- **Authentication Screens (`/login`, `/register`):** Modern brand card with tabbed email login and one-click Google OAuth button.
- **Dashboard (`/dashboard`):** 
  - Time-aware banner (`Good morning/afternoon/evening, Name`).
  - 4 Summary cards (Total, Completed, In Progress, Overdue).
  - Main Column: Filter toolbar & task grid with tags, due dates, subtask progress bars, and AI insight badges.
  - Right Sidebar: Natural language AI task creation widget, 7-day upcoming deadlines list, and AI productivity recommendations.

---

## Security Notes

- **Secrets Protection:** No credentials or API keys are committed or exposed to client bundles.
- **User Isolation:** All task mutations verify `Task.findOne({ _id: taskId, user: req.user.id })`.
- **Headers & CORS:** Powered by `helmet` security headers and origin-restricted `cors` middleware.

---

## Future Enhancements

- WebSockets for real-time task sync across browser tabs.
- Calendar integration (Google Calendar / iCal export).
- Kanban board view mode toggle.
- Team workspaces and task sharing permissions.
