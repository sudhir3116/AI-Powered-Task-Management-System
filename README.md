# TaskFlow AI — Enterprise AI-Powered SaaS Task Management Platform

> A SaaS-ready, multi-tenant enterprise task management platform featuring Role-Based Access Control (RBAC), team email invitations via Resend, MongoDB analytics aggregation, in-app notification center, audit logging, task assignments, Groq AI (Llama 3.3 70B) automation, and System Admin portal.

[![Tests](https://img.shields.io/badge/tests-108%20passing-brightgreen)](#testing) [![Node](https://img.shields.io/badge/node-v18%2B-green)](https://nodejs.org) [![React](https://img.shields.io/badge/react-v19-61DAFB)](https://react.dev) [![License](https://img.shields.io/badge/license-ISC-blue)](#)

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [SaaS & Enterprise Features](#saas--enterprise-features)
3. [Architecture & Multi-Tenancy](#architecture--multi-tenancy)
4. [Technology Stack](#technology-stack)
5. [RBAC & Permissions Matrix](#rbac--permissions-matrix)
6. [AI Integration (Groq Llama 3.3 70B)](#ai-integration-groq-llama-3-70b)
7. [Email Infrastructure (Resend)](#email-infrastructure-resend)
8. [API Overview](#api-overview)
9. [Database Design](#database-design)
10. [Local Development Setup](#local-development-setup)
11. [Testing & Verification](#testing--verification)
12. [Security & Hardening](#security--hardening)
13. [Subscription Architecture](#subscription-architecture)

---

## Project Overview

**TaskFlow AI** is a SaaS-ready productivity platform built for teams and enterprises. Driven by **Groq's Llama 3.3 70B** model, TaskFlow AI automates task parsing, urgency evaluation, subtask breakdowns, and productivity coaching, while isolating data across multi-tenant workspaces with role-based authorization (`OWNER`, `ADMIN`, `MEMBER`, `SYSTEM_ADMIN`).

---

## SaaS & Enterprise Features

### Multi-Tenant Workspaces & RBAC
- Auto-provisions personal workspaces on registration with role `OWNER`.
- Workspace dropdown selector in Navbar with instant switching.
- Enforces server-side RBAC middleware (`requireWorkspaceRole`).

### Team Members & Secure Email Invitations
- Cryptographically secure 32-byte invitation tokens hashed via SHA-256 in MongoDB.
- Resend email integration sending responsive invitation links (`FRONTEND_URL/invitations/<token>`).
- Dedicated acceptance landing page enforcing recipient email verification and 7-day expiration.

### Organization Analytics & Team Dashboard
- High-performance MongoDB aggregation pipelines (`Task.aggregate()`).
- Computes total, completed, in-progress, pending, overdue tasks, and completion rate %.
- CSS-based Status and Priority distribution progress bars.
- Team member workload breakdown table (`OWNER` & `ADMIN`).
- Upcoming 7-day deadlines list.

### In-App Notification Center
- Real-time 🔔 notification bell icon in Navbar with unread badge counter.
- Notifications emitted for `TASK_ASSIGNED`, `ROLE_CHANGED`, `WORKSPACE_INVITATION`, etc.
- Support for mark as read and mark all as read.

### Enterprise Audit Logging
- Tracks platform actions (`login`, `task_created`, `task_updated`, `task_assigned`, `member_invited`, `role_changed`).
- Never records sensitive tokens, passwords, or API keys.

### Task Assignment
- Workspace members can assign tasks to team members within the active workspace.
- Dashboard filtering by "All Tasks", "My Tasks", "Assigned to Me", and "Assigned by Me".

### Subscription Architecture Foundation
- Pre-configured subscription plan tiers (`FREE`, `PRO`, `BUSINESS`, `ENTERPRISE`).
- Service helper `canUseFeature(organization, feature)` ready for billing integration.

### System Admin Portal (`SYSTEM_ADMIN`)
- Platform-level administration routes (`/api/admin/overview`, `/api/admin/users`, `/api/admin/organizations`).
- System health metrics endpoint returning uptime, status, and DB connection state safely.

---

## Architecture & Multi-Tenancy

```
TaskFlow AI Architecture
├── Client (React 19 + Vite 8 + Material UI)
│   ├── Context: AuthContext, WorkspaceContext
│   ├── Pages: Login, Register, Dashboard, WorkspaceMembers, AcceptInvitation, Settings
│   └── API: Axios with X-Workspace-Id Header Interceptor
└── Server (Node.js + Express 5 + MongoDB)
    ├── Middleware: authMiddleware, workspaceMiddleware, rbacMiddleware, systemAdminMiddleware
    ├── Models: User, Organization, OrganizationMember, Task, Invitation, Notification, AuditLog
    ├── Services: Auth, Task, Organization, Invitation, Analytics, Notification, AuditLog, Email, AI
    └── Routes: /api/auth, /api/workspaces, /api/invitations, /api/notifications, /api/tasks, /api/ai, /api/admin
```

---

## Technology Stack

| Layer | Technologies |
|-------|--------------|
| **Frontend** | React 19, Vite 8, React Router 7, Material UI (MUI) v9 |
| **Backend** | Node.js (v18+), Express 5 |
| **Database** | MongoDB Atlas, Mongoose 9 |
| **Authentication** | JWT (`jsonwebtoken`), Google OAuth (`google-auth-library`), `bcryptjs` |
| **AI Engine** | Groq SDK (`llama-3.3-70b-versatile`) |
| **Email Service** | Resend API (`resend`) |
| **Documentation** | Swagger / OpenAPI 3.0 (`swagger-ui-express`) |
| **Testing** | Jest 29, Supertest, `mongodb-memory-server` |

---

## RBAC & Permissions Matrix

| Action | OWNER | ADMIN | MEMBER | SYSTEM_ADMIN |
|---|---|---|---|---|
| View Workspace Tasks | ✅ | ✅ | ✅ | Platform View |
| Create & Edit Tasks | ✅ | ✅ | ✅ | — |
| Assign Workspace Tasks | ✅ | ✅ | ❌ | — |
| Invite Team Members | ✅ | ✅ (MEMBER only) | ❌ | — |
| Update Workspace Details | ✅ | ✅ | ❌ | — |
| Change Member Roles | ✅ | ❌ | ❌ | — |
| Delete Workspace | ✅ | ❌ | ❌ | — |
| View Audit Logs | ✅ | ✅ | ❌ | — |
| Access `/api/admin` Portal | ❌ | ❌ | ❌ | ✅ |

---

## Local Development Setup

### 1. Server Environment (`server/.env`)
```env
NODE_ENV=development
PORT=8000
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/taskflow_ai
JWT_SECRET=your-32-character-random-jwt-secret
GROQ_API_KEY=your-groq-api-key
CLIENT_ORIGIN=http://localhost:5173
FRONTEND_URL=http://localhost:5173
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
EMAIL_API_KEY=your-resend-api-key
EMAIL_FROM=TaskFlow AI <onboarding@resend.dev>
```

### 2. Client Environment (`client/.env`)
```env
VITE_API_BASE_URL=http://localhost:8000/api
VITE_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

### 3. Installation & Run
```bash
# Start Server
cd server
npm install
npm run dev

# Start Client
cd client
npm install
npm run dev
```

---

## Testing & Verification

Backend automated integration tests execute in-memory using `mongodb-memory-server`.

```bash
cd server
npm test
```

**Test Results:** **13 Test Suites Passed, 108 Tests Passed (100% Pass Rate)** covering Auth, Tasks, AI, Email, Workspaces, RBAC, Team Invitations, Analytics, Notifications, Audit Logs, Task Assignment, and System Admin routes.

Client production build and linting:
```bash
cd client
npm run build
npm run lint
```

---

## Security & Hardening

- **Multi-Tenant Scoping**: Queries strictly filter by `organization: req.workspace._id`.
- **Server-Side Authorization**: Roles are derived exclusively from DB membership context (`req.membership.role`).
- **Input Sanitization**: Request payloads strip `_id`, `user`, `organization`, and `systemRole` parameters.
- **Header Protections**: Configured with `helmet`, CORS origin verification, and API rate limiting.
