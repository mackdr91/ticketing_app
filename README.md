<!--
Author: Domonick Mack
Date: 2026-11-15
Description: Comprehensive documentation for the PulseDesk IT & Customer Support Helpdesk Ticketing System.
-->

# PulseDesk — IT & Customer Support Helpdesk Ticketing System

PulseDesk is a full-stack, role-based **IT & Customer Support Helpdesk Ticketing System** engineered with a Linear/Zendesk-inspired **Modern SaaS Sidebar + Split-Pane Detail View**, an interactive **Kanban Board**, **SLA Countdown Timers**, **Threaded Comments & Staff Internal Notes**, **Markdown & File Attachments**, **Real-Time SSE Notifications**, and an **Analytics Dashboard** in a sleek **Dark & Light Mode Slate/Indigo aesthetic**.

---

## Key Features

- **Role-Based Authentication & Access Control**:
  - **Admin (`ADMIN`)**: Full platform oversight, agent assignment, status/priority workflows, internal notes, and global analytics.
  - **Support Agent (`AGENT`)**: Triage queue, self-assignment, SLA tracking, internal staff notes, public replies, and Kanban management.
  - **Customer / Requester (`CUSTOMER`)**: Submit new support tickets with attachments & Markdown, track live SLA status, and reply on public threads (internal staff notes are strictly isolated).
- **Ticket Lifecycle Management**:
  - Status workflow: `OPEN` → `IN_PROGRESS` → `WAITING_ON_CUSTOMER` → `RESOLVED` → `CLOSED`
  - Priority levels with automated SLA deadlines: `URGENT` (2h), `HIGH` (8h), `MEDIUM` (24h), `LOW` (72h)
  - Categories (`HARDWARE`, `SOFTWARE`, `NETWORK`, `ACCESS`, `BILLING`, `GENERAL`) and custom tags
- **Dual Workspace Views**:
  - **Split-Pane Queue View**: Dense filterable/searchable ticket table paired with an instant slide/split detail inspector.
  - **Kanban Board View**: Drag-and-drop status columns with live SLA and priority badges.
- **Threaded Collaboration & Audit Trail**:
  - Public Markdown replies, staff-only internal notes (`isInternal`), file attachments, and an immutable activity log (`CREATED`, `STATUS_CHANGED`, `PRIORITY_CHANGED`, `ASSIGNED`, `COMMENTED`).
- **Real-Time Event Stream (SSE)**:
  - Instant UI updates and unread notification alerts via `/api/events`.
- **Analytics & SLA Dashboard**:
  - KPI cards, SLA compliance rates, average response/resolution metrics, priority distribution, and agent workload tables.

---

## Tech Stack

- **Framework**: Next.js 15 (App Router) + TypeScript 5
- **Database & ORM**: PostgreSQL 16 + Prisma ORM
- **Styling**: Tailwind CSS v4 (Slate/Indigo Dark & Light Mode) + Lucide Icons
- **Auth**: Stateless HTTP-Only JWT (`jose`) + `bcryptjs`
- **Validation**: Zod
- **Testing**: Vitest
- **Containerization & CI/CD**: Docker, Docker Compose, GitHub Actions, Railway

---

## Quick Start (Docker Compose — Recommended)

1. **Clone the repository**:
   ```bash
   git clone https://github.com/mackdr91/ticketing_app.git
   cd ticketing_app
   ```

2. **Start the containerized environment**:
   ```bash
   docker compose up -d --build
   ```

3. **Access the application**:
   Open `http://localhost:3000` in your browser.

---

## Demo Accounts (Seeded Automatically)

| Role | Email | Password | Capabilities |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@pulsedesk.io` | `Password123!` | Full system control, analytics, all tickets, internal notes |
| **Agent** | `agent@pulsedesk.io` | `Password123!` | Ticket triage, assignment, status updates, internal notes |
| **Customer** | `customer@pulsedesk.io` | `Password123!` | Submit & track own tickets, public comments, attachments |

---

## Local Development & Testing

```bash
# Install dependencies
npm install

# Generate Prisma Client & push schema
npx prisma generate
npx prisma db push
npm run db:seed

# Start development server
npm run dev

# Run linter, type-check, and automated test suite
npm run lint
npx tsc --noEmit
npm run test
```
