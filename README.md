# Velocity Global Project Dashboard

Real-time internal dashboard for agency project delivery with strict API-level RBAC, WebSocket live activity feed, notifications, and overdue task automation.

## Stack

- Frontend: React + TypeScript + Vite
- Backend: Node.js + Express + TypeScript
- DB/ORM: PostgreSQL + Prisma
- Real-time: Socket.io
- Background jobs: node-cron

## Why These Choices

- Express keeps middleware and RBAC composition straightforward for route-level auth guards.
- Socket.io was chosen over native WebSocket because it provides room-based targeting, reconnection, and auth middleware with less boilerplate.
- node-cron is sufficient for deterministic internal scheduling (every 15 minutes) without external queue infrastructure.
- Refresh token is stored in an `HttpOnly` cookie; access token is in memory only on the frontend.

## Role Access Rules

- `ADMIN`: full system access and global activity stream.
- `PM`: can only access and manage projects they created.
- `DEVELOPER`: only assigned tasks; cannot read other developers' tasks even by direct API call.
- API middleware + service-level ownership checks enforce all constraints server-side.

## Core Features

- JWT auth (`/api/auth/login`, `/api/auth/refresh`, `/api/auth/logout`) with refresh-cookie flow.
- Projects and tasks with status, priority, due dates, assignment, and persisted `ActivityLog`.
- Real-time activity feed events scoped by role:
  - Admin receives global events.
  - PM receives events only for their projects.
  - Developer receives events only for assigned tasks.
- Offline activity catch-up: `/api/activity/missed?since=<ISO>` returns last 20 DB events.
- Real-time notifications with unread badge updates via WebSocket (`notification:count`).
- Overdue scheduler marks late tasks in background (`node-cron`) and emits socket events.
- URL-shareable task filters: `status`, `priority`, `dueAfter`, `dueBefore`.

## Database Schema & Indexing

Main entities: `User`, `RefreshToken`, `Client`, `Project`, `Task`, `ActivityLog`, `Notification`.

Index highlights:
- `User(email)` and `RefreshToken(token)` for auth path lookup.
- `Task(projectId)`, `Task(assignedToId)`, `Task(status)`, `Task(priority)`, `Task(dueDate,isOverdue)` for dashboard/filter queries and overdue scan.
- `ActivityLog(projectId,createdAt DESC)` and `ActivityLog(taskId,createdAt DESC)` for role-scoped feed and catch-up retrieval.
- `Notification(userId,isRead)` for unread count.

## Local Setup (Docker Preferred)

### Docker

```bash
docker compose up --build
```

Services:
- Frontend: [http://localhost:5173](http://localhost:5173)
- Backend: [http://localhost:3001](http://localhost:3001)
- Postgres: `localhost:5432`

### Non-Docker

1. Create DB and set `backend/.env` (copy from `backend/.env.example`).
2. Backend:
   ```bash
   cd backend
   npm install
   npx prisma generate
   npx prisma migrate dev --name init
   npm run seed
   npm run dev
   ```
3. Frontend:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

## Seed Data

`backend/prisma/seed.ts` creates:
- 1 Admin, 2 PMs, 4 Developers
- 3 projects, each with 5+ tasks in mixed statuses
- at least 2 overdue tasks
- pre-seeded activity logs and notifications

Default password for seeded users: `password123`

## Known Limitations

- Presence count is currently emitted only to admin sockets (by design of the requirement).
- UI is intentionally compact and functional; it is not yet fully optimized for mobile workflows.
- Cron-based overdue checks run every 15 minutes; a queue-based architecture would scale better for very large workloads.

## Explanation (Hardest Problem Solved)

The hardest problem was enforcing role-filtered real-time delivery without leaking data across project rooms. A naive room model lets any developer in a project receive all project events, which violates the requirement that developers can only see activity for tasks assigned to them. I solved this by moving event fan-out from broad project-room broadcasting to recipient-targeted emits. On each task change, the backend now computes recipients from persisted relationships: all admins (global room), the owning PM (project creator), and only developers assigned to the affected task. The activity event itself is still persisted in `ActivityLog` first, then emitted, so reconnect and missed-event workflows remain source-of-truth in PostgreSQL.  

For offline catch-up, clients persist a timestamp and call `/api/activity/missed`, which returns the last 20 authorized events directly from DB with role-aware filtering. If I were to improve one thing, I would centralize real-time authorization into a dedicated event broker module with integration tests that replay task transitions and assert exact recipient sets for each role.
