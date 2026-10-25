# 🚀 ReachInbox – Distributed Email Job Scheduler

[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.19-lightgrey?logo=express&logoColor=white)](https://expressjs.com/)
[![BullMQ](https://img.shields.io/badge/BullMQ-5.12-red?logo=redis&logoColor=white)](https://docs.bullmq.io/)
[![Redis](https://img.shields.io/badge/Redis-7%20AOF-dc382d?logo=redis&logoColor=white)](https://redis.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Elasticsearch](https://img.shields.io/badge/Elasticsearch-8.15-005571?logo=elastic&logoColor=white)](https://www.elastic.co/)
[![React](https://img.shields.io/badge/React-18-61dafb?logo=react&logoColor=white)](https://react.dev/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38bdf8?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

A high-performance, full-stack distributed email scheduling service and real-time dashboard built for the **ReachInbox Technical Assessment**.

- **Candidate**: Tarun
- **Reviewers**: Mitrajit, Yadav036

---

## 📑 Table of Contents

- [Overview](#-overview)
- [System Architecture](#-system-architecture)
- [Core Design Principles & Implementation](#-core-design-principles--implementation)
  - [1. Millisecond Precision Scheduling (Zero Cron)](#1-millisecond-precision-scheduling-zero-cron)
  - [2. Crash Resilience & Boot Reconciliation](#2-crash-resilience--boot-reconciliation)
  - [3. Strict Idempotency & Zero Duplication](#3-strict-idempotency--zero-duplication)
  - [4. Multi-Tiered Rate Limiting](#4-multi-tiered-rate-limiting)
  - [5. Round-Robin Multi-Sender Dispatching](#5-round-robin-multi-sender-dispatching)
  - [6. Full-Text & Fuzzy Search](#6-full-text--fuzzy-search)
- [Tech Stack](#-tech-stack)
- [Quick Start Guide](#-quick-start-guide)
  - [Prerequisites](#prerequisites)
  - [1. Infrastructure Services (Docker)](#1-start-infrastructure-services)
  - [2. Backend Setup](#2-start-backend-api--worker)
  - [3. Frontend Setup](#3-start-frontend-dashboard)
- [Service URLs & Ports](#-service-urls--ports)
- [Environment Variables](#-environment-variables)
- [API Reference](#-api-reference)
- [Evaluation & Demo Walkthrough](#-evaluation--demo-walkthrough)
- [Project Structure](#-project-structure)
- [Engineering Trade-offs & Decisions](#-engineering-trade-offs--decisions)

---

## 🌟 Overview

The **ReachInbox Email Scheduler** is engineered to handle scheduled outbound email delivery at scale. Instead of relying on crude polling intervals or cron jobs, the system couples **BullMQ delayed jobs** over **Redis AOF** with an **ACID-compliant PostgreSQL** datastore. It guarantees:

- **Exact-time dispatch** with millisecond precision.
- **Zero duplicate sends** under high concurrency and worker restarts.
- **Strict rate-limit adherence** (inter-email spacing + per-sender hourly quota) with automatic postponement to future execution windows.
- **Instant visibility**: Glassmorphic dashboard, live status tracking, email web previews, and embedded Bull-Board queue administration.

---

## 🏗️ System Architecture

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        React Dashboard (Vite)                          │
│        [ 1-Click Demo Login | CSV Lead Upload | Real-Time Tabs ]       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / REST
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                         Express API Server                             │
│       [ Google OAuth / JWT | Validation (Zod) | DB Migrations ]        │
└─────────────┬─────────────────────┬────────────────────┬───────────────┘
              │                     │                    │
              ▼                     ▼                    ▼
     ┌─────────────────┐   ┌─────────────────┐  ┌─────────────────┐
     │   PostgreSQL    │   │  Elasticsearch  │  │   Redis 7 AOF   │
     │(Source of Truth)│   │  (Fuzzy Search) │  │  (Delayed ZSET) │
     └────────▲────────┘   └─────────────────┘  └────────┬────────┘
              │                                          │
              │         ┌────────────────────────────────┘
              │         │ Jobs triggered when delay expires
              │         ▼
┌─────────────┴──────────────────────────────────────────────────────────┐
│                   BullMQ Distributed Worker (Pool)                     │
│                                                                        │
│  1. Atomic SQL Claim  ──►  UPDATE emails SET status='processing' ...   │
│  2. Lua Rate Limit    ──►  Atomic counter per sender/hour              │
│  3. Throttle Limiter  ──►  Enforce MIN_DELAY_BETWEEN_EMAILS_MS (2s)    │
│  4. Dispatch SMTP     ──►  Nodemailer (Ethereal / Mailpit)             │
│  5. Overflow Action   ──►  Reschedule to next hour window + Slack alert│
└────────────────────────────────────────────────────────────────────────┘
```

---

## ⚙️ Core Design Principles & Implementation

### 1. Millisecond Precision Scheduling (Zero Cron)
- Traditional cron jobs introduce polling lag, race conditions, and missed ticks.
- This system registers each lead as an independent BullMQ **delayed job** (`delay = scheduledAt - now`) with deterministic `jobId = emailId`.
- BullMQ leverages Redis Sorted Sets (`ZSET`), where the absolute execution timestamp serves as the sort score. When the score is reached, Redis pushes the job into the active execution stream with sub-second accuracy.

### 2. Crash Resilience & Boot Reconciliation
- **Redis AOF (Append-Only File)**: Redis is configured with `--appendonly yes`, guaranteeing delayed timers persist across container or service restarts.
- **Startup Reconciliation (`reconcile.ts`)**: On boot, the backend queries PostgreSQL for any email in `scheduled` state with `scheduled_at <= now() + 2h` and re-synchronizes BullMQ, safely ignoring jobs that are already queued.
- **Absolute Timestamps**: Schedules rely on UTC absolute timestamps (`TIMESTAMPTZ`), meaning unexpected server downtime never distorts schedule offsets.

### 3. Strict Idempotency & Zero Duplication
- **Deterministic Job IDs**: `jobId` in BullMQ matches the email's primary key (`UUID`). Enqueuing duplicate jobs is rejected at the Redis layer.
- **Atomic Database Claiming**: Before transmission, a worker executes an atomic SQL query:
  ```sql
  UPDATE emails
  SET status = 'processing', claimed_at = now(), attempts = attempts + 1
  WHERE id = $1 AND (status = 'scheduled' OR (status = 'processing' AND claimed_at < now() - INTERVAL '2 minutes'))
  RETURNING *;
  ```
- If another worker claims or completes the job, the query returns 0 rows and the worker immediately skips execution.
- **Orphan Recovery**: If a worker crashes mid-send, claims older than 2 minutes can be reclaimed cleanly.
- **Deterministic Message-ID**: Outbound emails include `messageId = <emailId@reachinbox.local>` to prevent duplicate downstream SMTP processing.

### 4. Multi-Tiered Rate Limiting
The service protects sender reputation using a two-level throttle mechanism:
1. **Global Inter-Email Spacing**: A BullMQ worker-level limiter enforces a strict 2-second gap (`MIN_DELAY_BETWEEN_EMAILS_MS=2000`) between outgoing transmissions across all worker threads.
2. **Per-Sender Hourly Quota**: Tracked atomically using a custom Redis Lua script (`tryConsume`).
   - If a sender reaches their limit (e.g. 200 emails/hour), the job is **not dropped or failed**.
   - Instead, the worker recalculates the start of the next hour window (`nextWindow`), updates `scheduled_at` in Postgres, reschedules the job in BullMQ via `job.moveToDelayed()`, and dispatches an automated alert to the configured Slack webhook.

### 5. Round-Robin Multi-Sender Dispatching
- Supports an arbitrary pool of SMTP sender accounts (persisted in the `senders` table).
- Outgoing campaigns automatically distribute recipients across senders via modulo round-robin:
  ```ts
  sender: senders[index % senders.length]
  ```
- Automatically creates 3 real Ethereal test accounts on first start if no manual credentials are provided.

### 6. Full-Text & Fuzzy Search
- Outbox data is synchronized to **Elasticsearch 8** on schedule, dispatch, and reschedule.
- Evaluators can perform instantaneous fuzzy search across recipient addresses, subjects, senders, and email bodies directly from the dashboard.

---

## 💻 Tech Stack

| Layer | Technologies |
|---|---|
| **Backend** | Node.js, Express, TypeScript, Zod, tsx |
| **Queue & Cache** | BullMQ, Redis 7 (AOF enabled), IORedis |
| **Database** | PostgreSQL 16 (pg connection pooling) |
| **Search Engine** | Elasticsearch 8.15 |
| **Mail Transport** | Nodemailer (Ethereal Email & Mailpit fallback) |
| **Frontend** | React 18, Vite, Tailwind CSS, Lucide Icons |
| **Observability** | Bull-Board UI (`@bull-board/express`), Slack Webhooks |
| **Containerization** | Docker & Docker Compose |

---

## ⚡ Quick Start Guide

### Prerequisites
- [Docker](https://www.docker.com/) & Docker Compose
- [Node.js](https://nodejs.org/) (v18 or higher)
- `npm` or `pnpm`

---

### 1. Start Infrastructure Services

Spin up PostgreSQL, Redis (with AOF), Elasticsearch, and Mailpit in the background:

```bash
docker compose up -d
```

Verify all containers are healthy:
```bash
docker compose ps
```

---

### 2. Start Backend (API & Worker)

```bash
cd backend
npm install
```

Configure your environment file (pre-configured defaults work out of the box):
```bash
cp .env.example .env
```

Run database migrations and launch the dev server:
```bash
npm run dev
```

> **Note**: On the initial startup, the backend automatically seeds Ethereal SMTP sender accounts and executes table migrations.
> - API runs on: `http://localhost:4000`
> - Queue Monitor (Bull-Board): `http://localhost:4000/admin/queues`

---

### 3. Start Frontend Dashboard

Open a new terminal window:

```bash
cd frontend
npm install
npm run dev
```

Open your browser and navigate to:
```text
http://localhost:5173
```

---

## 🔗 Service URLs & Ports

| Service | Address | Purpose |
|---|---|---|
| **Frontend App** | `http://localhost:5173` | React Dashboard & Email Composer |
| **Backend API** | `http://localhost:4000` | REST API & Scheduler Service |
| **Bull-Board** | `http://localhost:4000/admin/queues` | Live Redis & BullMQ Queue Monitor |
| **PostgreSQL** | `localhost:5432` | Primary relational database (`reachinbox`) |
| **Redis** | `localhost:6379` | Queue storage with AOF enabled |
| **Elasticsearch** | `http://localhost:9200` | Full-text outbox search engine |
| **Mailpit (Fallback)** | `http://localhost:8025` | Local SMTP visual mailbox |

---

## 🔑 Environment Variables

The backend reads configuration from `backend/.env`. Key parameters:

| Variable | Default Value | Description |
|---|---|---|
| `PORT` | `4000` | Express HTTP server port |
| `FRONTEND_URL` | `http://localhost:5173` | CORS allowed origin & redirect destination |
| `DATABASE_URL` | `postgres://reachinbox:reachinbox@localhost:5432/reachinbox` | PostgreSQL connection string |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection URL |
| `ELASTICSEARCH_URL`| `http://localhost:9200` | Elasticsearch host |
| `WORKER_CONCURRENCY`| `5` | Concurrent jobs processed per worker instance |
| `MIN_DELAY_BETWEEN_EMAILS_MS` | `2000` | Global minimum gap between sent emails (2 sec) |
| `MAX_EMAILS_PER_HOUR_PER_SENDER` | `200` | Default hourly dispatch quota per sender |
| `SENDER_COUNT` | `3` | Number of auto-generated Ethereal senders |
| `JWT_SECRET` | `change-me` | Secret for HTTP-only session cookies |
| `GOOGLE_CLIENT_ID` / `_SECRET` | *(Optional)* | Google OAuth 2.0 credentials |
| `SLACK_CLIENT_ID` / `_SECRET` | *(Optional)* | Slack webhook OAuth credentials |

---

## 📡 API Reference

All email endpoints require authentication via the HTTP-only session cookie (`token`).

### Authentication
- `GET /api/auth/demo` – Instant **1-Click Demo Login** for rapid evaluation.
- `GET /api/auth/google` – Initiates Google OAuth 2.0 flow.
- `GET /api/auth/google/callback` – Handles OAuth callback and sets session cookie.
- `GET /api/auth/me` – Returns currently logged-in user profile.
- `POST /api/auth/logout` – Clears session cookie.

### Email Operations
- `POST /api/emails/schedule` – Schedule a single email or batch campaign.
  ```json
  {
    "subject": "Product Announcement",
    "body": "<p>Hello from ReachInbox!</p>",
    "leads": ["user1@example.com", "user2@example.com"],
    "startTime": "2026-10-25T12:00:00.000Z",
    "delaySeconds": 5,
    "hourlyLimit": 50
  }
  ```
- `GET /api/emails/scheduled` – Returns list of upcoming scheduled/processing emails.
- `GET /api/emails/sent` – Returns list of dispatched and failed emails.
- `GET /api/emails/counts` – Real-time counts of scheduled and sent items.
- `GET /api/emails/search?q={query}&tab={scheduled|sent}` – Elasticsearch-powered fuzzy search.

### Slack Integration
- `GET /api/slack/install` – Connects a Slack incoming webhook.
- `GET /api/slack/callback` – Finishes Slack OAuth handshake.

---

## 🧪 Evaluation & Demo Walkthrough

### 1. Instant 1-Click Evaluation
1. Go to `http://localhost:5173`.
2. Click **"Sign in as Demo User"** (no Google credentials needed).
3. You are redirected to the glassmorphic Outbox dashboard.

### 2. Schedule a Campaign
1. Click **"Compose Email"**.
2. Upload a `.csv` list of emails or enter recipient emails.
3. Choose a scheduled start time and inter-email delay (e.g. 5 seconds).
4. Hit **"Schedule"**.
5. Switch to the **Scheduled** tab: notice the countdown and scheduled timestamps.

### 3. Verify Queue Execution in Real-Time
1. Open the **Bull-Board Monitor** at `http://localhost:4000/admin/queues`.
2. Watch the jobs transition from **Delayed** ➔ **Active** ➔ **Completed**.
3. Return to the dashboard **Sent** tab:
   - Each sent email displays the exact dispatch timestamp.
   - Click the **"Preview"** link to inspect the actual rendered email in Ethereal's web viewer.

### 4. Test Crash Recovery (Zero Data Loss)
1. Schedule 20 emails with a 10-second delay.
2. In the terminal, kill the backend server (`Ctrl + C`).
3. Restart the backend (`npm run dev`).
4. Notice the startup log: `[reconcile] reconciled N scheduled emails into BullMQ`.
5. No jobs are lost or duplicated; execution resumes smoothly.

### 5. Test Rate Limiting & Auto-Reschedule
1. Set `hourlyLimit: 2` or pass a low value.
2. Schedule 5 emails.
3. Once 2 emails are dispatched, subsequent jobs are safely deferred to the start of the next hour (`nextWindow`) instead of failing.
4. If Slack is connected, a rate-limit alert is triggered immediately.

---

## 📁 Project Structure

```text
outbox-assignment/
├── docker-compose.yml       # Postgres 16, Redis 7 (AOF), Elasticsearch 8, Mailpit
├── README.md                # Project documentation
├── backend/
│   ├── src/
│   │   ├── index.ts         # Server entrypoint, migrations & reconcile trigger
│   │   ├── config.ts        # Environment variable parsing & validation
│   │   ├── db.ts            # PostgreSQL pool & automated DDL migrations
│   │   ├── redis.ts         # Redis connection factory
│   │   ├── queue.ts         # BullMQ queue declaration & enqueue helpers
│   │   ├── worker.ts        # Distributed worker: atomic claim, rate limiter, SMTP
│   │   ├── auth.ts          # JWT session verification middleware
│   │   ├── routes/
│   │   │   ├── auth.ts      # Google OAuth & 1-Click Demo login
│   │   │   ├── emails.ts    # Schedule, list, counts & search endpoints
│   │   │   └── slack.ts     # Slack OAuth incoming webhook installation
│   │   └── services/
│   │       ├── mailer.ts    # Nodemailer Ethereal multi-sender management
│   │       ├── rateLimiter.ts # Atomic Redis Lua script for hourly quota
│   │       ├── reconcile.ts # Boot-time DB ➔ BullMQ synchronization
│   │       ├── search.ts    # Elasticsearch indexing & multi-field query
│   │       └── slack.ts     # Slack alert dispatcher
│   ├── package.json
│   └── tsconfig.json
└── frontend/
    ├── src/
    │   ├── App.tsx          # Main application router
    │   ├── pages/           # Login & Dashboard views
    │   ├── components/      # Glassmorphic Composer, Email Tables, Badges
    │   └── main.tsx         # React entrypoint
    ├── package.json
    ├── tailwind.config.js
    └── vite.config.ts
```

---

## ⚖️ Engineering Trade-offs & Decisions

| Decision | Alternative Considered | Rationale |
|---|---|---|
| **BullMQ Delayed Jobs** | Cron jobs (`node-cron`) or `pg_cron` | Cron polling is inherently imprecise, creates database lock contention, and fails under dynamic sub-second intervals. Redis `ZSET` timers provide $O(\log N)$ insert/pop with exact millisecond dispatch. |
| **Redis AOF + DB Reconciliation** | Pure In-Memory Redis | In-memory queues lose all state upon restart. Pairing Redis Append-Only File persistence with a boot-time PostgreSQL reconciliation guarantees zero dropped jobs. |
| **Atomic Conditional Claims** | Distributed Redis Locks (Redlock) | Redis locks add network roundtrips and require lease-renewal heartbeats. A conditional SQL update (`UPDATE ... WHERE status='scheduled'`) is atomic, durable, and uses the database's native row locks. |
| **Fixed Hour Window Rate-Limiting** | Sliding Window Log | Sliding window logs in Redis consume $O(N)$ memory per sender. An atomic Lua script with fixed hourly buckets is $O(1)$ in time and space, with the 2-second inter-message limiter preventing boundary bursts. |
| **Elasticsearch Auxiliary Index** | PostgreSQL `tsvector` | Elasticsearch provides out-of-the-box typo-tolerant fuzzy matching across millions of email records without degrading OLTP transaction throughput on PostgreSQL. |
| **Ethereal Mail Integration** | Mock/Dummy transporter | Ethereal generates real RFC-compliant SMTP transactions and creates instant shareable preview links for evaluators to inspect the rendered HTML/CSS. |

---

Made with focus for the **ReachInbox Technical Assessment**.
