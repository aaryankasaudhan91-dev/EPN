# 🎓 Educational Productivity Network (EPN)

> **AI-powered adaptive learning platform** that monitors student performance, diagnoses learning gaps, auto-generates personalized study materials, adapts curriculum pathways, and provides teacher oversight via Human-in-the-Loop (HITL) approvals.

---

## 📋 Table of Contents

- [Architecture Overview](#architecture-overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [User Roles & Features](#user-roles--features)
- [AI Agent Architecture](#ai-agent-architecture)
- [Quick Start (Docker)](#quick-start-docker)
- [Local Development](#local-development)
- [API Reference](#api-reference)
- [Database Schema](#database-schema)
- [Blockchain Ledger](#blockchain-ledger)
- [Safety & HITL Workflow](#safety--hitl-workflow)
- [Demo Credentials](#demo-credentials)
- [Environment Variables](#environment-variables)

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        EPN Platform                              │
│                                                                  │
│  ┌──────────────┐    ┌──────────────────────────────────────┐   │
│  │   Frontend   │    │              Backend API              │   │
│  │  React + TS  │◄──►│           Node.js + Express          │   │
│  │  Tailwind    │    │                                      │   │
│  │  Recharts    │    │  ┌─────────────────────────────────┐ │   │
│  └──────────────┘    │  │        AI Agent Layer           │ │   │
│                      │  │                                 │ │   │
│                      │  │  ┌──────────┐  ┌────────────┐  │ │   │
│                      │  │  │ Monitor  │  │ Diagnostic │  │ │   │
│                      │  │  │  Agent   │  │   Agent    │  │ │   │
│                      │  │  └──────────┘  └────────────┘  │ │   │
│                      │  │  ┌──────────┐  ┌────────────┐  │ │   │
│                      │  │  │Curriculum│  │  Content   │  │ │   │
│                      │  │  │ Planner  │  │ Generator  │  │ │   │
│                      │  │  └──────────┘  └────────────┘  │ │   │
│                      │  │         ┌──────────────┐        │ │   │
│                      │  │         │ Orchestrator │        │ │   │
│                      │  │         └──────────────┘        │ │   │
│                      │  └─────────────────────────────────┘ │   │
│                      │                                      │   │
│                      │  ┌──────────┐  ┌──────────────────┐ │   │
│                      │  │ OpenAI   │  │  Blockchain       │ │   │
│                      │  │ Service  │  │  Ledger Service   │ │   │
│                      │  │(+mock)   │  │  (hash-chained)   │ │   │
│                      │  └──────────┘  └──────────────────┘ │   │
│                      └──────────────────────────────────────┘   │
│                                    │                             │
│                      ┌─────────────▼────────────┐               │
│                      │       PostgreSQL DB        │               │
│                      └──────────────────────────┘               │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Student** submits a quiz → Assessment stored in DB
2. **Orchestrator** triggers the AI pipeline:
   - **Monitor Agent** analyzes performance trends, calculates risk score
   - **Diagnostic Agent** updates the student's knowledge graph, identifies misconceptions
   - **Curriculum Planner** generates an adaptive learning plan (if risk ≥ 60)
   - **Content Generator** creates remedial study materials via OpenAI (or mock)
3. All AI actions are logged to the **Audit Log** and significant ones to the **Blockchain Ledger**
4. **Teacher** reviews pending approvals (HITL) — approves or rejects plans/content
5. **Student** sees approved materials in their dashboard
6. **Parent** can view progress and verify achievements against the ledger

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18 + TypeScript, Tailwind CSS, Recharts, React Router v6 |
| **Backend** | Node.js + Express, JWT auth, RBAC middleware |
| **Database** | PostgreSQL 16 with UUID primary keys |
| **AI** | OpenAI API (gpt-4o-mini) with mock fallback |
| **Blockchain** | Simulated permissioned hash-chained ledger (SHA-256) |
| **Deployment** | Docker + Docker Compose, Nginx reverse proxy |
| **Security** | Helmet, CORS, rate limiting, bcrypt, express-validator |

---

## 📁 Project Structure

```
education/
├── backend/
│   ├── src/
│   │   ├── agents/                 # AI agent services
│   │   │   ├── monitorAgent.js         # Performance monitoring
│   │   │   ├── diagnosticAgent.js      # Knowledge graph & gap detection
│   │   │   ├── curriculumPlannerAgent.js # Adaptive learning plans
│   │   │   ├── contentGenerationAgent.js # AI content generation
│   │   │   └── orchestratorAgent.js    # Pipeline coordinator
│   │   ├── db/
│   │   │   ├── pool.js                 # PostgreSQL connection pool
│   │   │   ├── migrate.js              # Migration runner
│   │   │   ├── migrations/
│   │   │   │   └── 001_initial_schema.sql
│   │   │   └── seeds/
│   │   │       └── seed.js             # Sample data seeder
│   │   ├── middleware/
│   │   │   ├── auth.js                 # JWT + RBAC middleware
│   │   │   └── auditLogger.js          # Audit trail middleware
│   │   ├── routes/
│   │   │   ├── auth.js                 # Authentication endpoints
│   │   │   ├── users.js                # User management
│   │   │   ├── students.js             # Student profiles
│   │   │   ├── assessments.js          # Quiz/test submissions
│   │   │   ├── knowledgeGraph.js       # Knowledge graph queries
│   │   │   ├── learningPlans.js        # Adaptive learning plans
│   │   │   ├── content.js              # Generated content
│   │   │   ├── approvals.js            # HITL approval workflow
│   │   │   ├── audit.js                # Audit log queries
│   │   │   ├── ledger.js               # Blockchain ledger
│   │   │   ├── analytics.js            # Dashboard analytics
│   │   │   └── agents.js               # Agent management
│   │   ├── services/
│   │   │   ├── openai.js               # OpenAI + mock fallback
│   │   │   └── ledger.js               # Hash-chained ledger service
│   │   └── index.js                    # Express app entry point
│   └── package.json
│
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── DashboardLayout.tsx
│   │   │   │   ├── Sidebar.tsx         # Role-aware navigation
│   │   │   │   └── Header.tsx          # Notifications + theme toggle
│   │   │   ├── ui/
│   │   │   │   ├── StatCard.tsx        # Metric display cards
│   │   │   │   ├── MasteryBar.tsx      # Progress bars
│   │   │   │   └── ApprovalCard.tsx    # HITL approval UI
│   │   │   └── charts/
│   │   │       ├── PerformanceChart.tsx # Line chart (Recharts)
│   │   │       └── SubjectRadarChart.tsx # Radar chart (Recharts)
│   │   ├── context/
│   │   │   ├── AuthContext.tsx         # JWT auth state
│   │   │   └── ThemeContext.tsx        # Dark/light mode
│   │   ├── pages/
│   │   │   ├── auth/
│   │   │   │   ├── LoginPage.tsx
│   │   │   │   └── RegisterPage.tsx
│   │   │   ├── student/
│   │   │   │   └── StudentDashboard.tsx
│   │   │   ├── teacher/
│   │   │   │   └── TeacherDashboard.tsx
│   │   │   ├── parent/
│   │   │   │   └── ParentDashboard.tsx
│   │   │   └── admin/
│   │   │       └── AdminDashboard.tsx
│   │   ├── services/
│   │   │   └── api.ts                  # Axios API client
│   │   ├── types/
│   │   │   └── index.ts                # TypeScript type definitions
│   │   └── App.tsx                     # Router + role-based routing
│   ├── package.json
│   ├── tailwind.config.js
│   └── tsconfig.json
│
├── docker/
│   ├── Dockerfile.backend
│   ├── Dockerfile.frontend
│   ├── docker-compose.yml
│   ├── nginx.conf
│   └── init-db.sh
│
├── .env.example
├── EPN_PRD.pdf
├── EPN_Report__1_.pdf
├── EPN_Tech_Stack_Specification.pdf
└── README.md
```

---

## 👥 User Roles & Features

### 🎓 Student Dashboard
- **Learning Progress**: Overall mastery score, subject-by-subject breakdown
- **Performance Timeline**: Line chart of scores over time
- **Subject Radar Chart**: Visual mastery overview across all subjects
- **Study Materials**: Approved worksheets, quizzes, flashcards, explanations
- **Achievement Badges**: Earned badges with blockchain verification
- **Risk Indicator**: Color-coded risk level (green/yellow/red)

### 👩‍🏫 Teacher Dashboard
- **Class Overview**: Total students, average mastery, at-risk count
- **Knowledge Gap Alerts**: Students with high risk scores flagged for attention
- **HITL Approval Panel**: Review and approve/reject AI-generated plans and content
- **Content Generator**: Request AI content for specific students and topics
- **Analytics**: Class performance trends, subject breakdowns
- **Audit Logs**: View all AI agent actions

### 👨‍👩‍👧 Parent Dashboard
- **Child Progress Summary**: Mastery scores, assessment counts, risk level
- **Subject Performance**: Recent performance by subject
- **Achievement Gallery**: All earned badges with timestamps
- **Ledger Verification**: Verify any record against the blockchain ledger

### 🔧 Administrator Dashboard
- **User Management**: List, search, activate/deactivate users by role
- **System Analytics**: User stats, agent activity, content stats
- **AI Configuration**: View autonomy levels, limits, circuit breaker status
- **Agent Health Monitor**: Real-time status of all AI agents
- **Audit Logs**: Full audit trail with agent and action filtering
- **Ledger Records**: View all blockchain blocks, verify chain integrity

---

## 🤖 AI Agent Architecture

### Monitor Agent (`monitorAgent.js`)
- Collects quiz scores and tracks learning activity
- Detects performance drops ≥ 15 percentage points
- Flags consistently low scores (< 50%)
- Calculates risk scores (0–100) per student
- Triggers teacher notifications for high-severity alerts
- Supports batch monitoring for all active students

### Diagnostic Agent (`diagnosticAgent.js`)
- Maintains per-student knowledge graphs (subject → concept → mastery)
- Detects misconceptions from wrong answer patterns
- Identifies root causes: `knowledge_gap`, `reading_difficulty`, `disengagement`, `concept_confusion`
- Assigns mastery labels: Novice → Developing → Approaching → Proficient → Mastered
- Updates overall mastery scores on student profiles

### Curriculum Planner Agent (`curriculumPlannerAgent.js`)
- Generates adaptive learning plans based on weak areas
- Creates remedial tasks for low-mastery concepts (priority: high/medium/low)
- Creates enrichment tasks for strong subjects
- Requires teacher approval for plans with > 3 new topics (configurable)
- Supports approve/reject workflow with audit trail

### Content Generation Agent (`contentGenerationAgent.js`)
- Generates: worksheets, MCQ quizzes, flashcards, explanations, revision notes, study plans
- Uses OpenAI API when `OPENAI_API_KEY` is set; falls back to rich mock data
- Circuit breaker: enforces daily generation limits per student
- All content requires teacher approval before student delivery
- Logs token usage for budget tracking

### Orchestrator Agent (`orchestratorAgent.js`)
- Coordinates the full pipeline: Monitor → Diagnostic → Curriculum → Content
- Implements circuit breaker pattern (5 failures → 60s cooldown)
- Routes approval requests to appropriate teachers
- Provides system health status for admin monitoring

---

## 🚀 Quick Start (Docker)

### Prerequisites
- Docker 24+ and Docker Compose v2+

### 1. Clone and configure

```bash
git clone https://gitlab.com/epn-group/education.git
cd education
cp .env.example .env
# Edit .env — at minimum set a strong JWT_SECRET
```

### 2. Start all services

```bash
cd docker
docker compose up -d
```

### 3. Run database migrations

```bash
docker compose run --rm migrate
```

### 4. Seed sample data

```bash
docker compose exec backend node src/db/seeds/seed.js
```

### 5. Access the application

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:5000 |
| API Health | http://localhost:5000/health |

---

## 💻 Local Development

### Prerequisites
- Node.js 20+
- PostgreSQL 16+

### Backend Setup

```bash
cd backend
npm install

# Configure environment
cp ../.env.example .env
# Edit .env with your local DB credentials

# Run migrations
npm run migrate

# Seed sample data
npm run seed

# Start development server (with hot reload)
npm run dev
```

### Frontend Setup

```bash
cd frontend
npm install

# Start development server
npm start
# Opens http://localhost:3000
```

### Database Setup (local)

```sql
-- Create database and user
CREATE DATABASE epn_db;
CREATE USER epn_user WITH PASSWORD 'epn_password';
GRANT ALL PRIVILEGES ON DATABASE epn_db TO epn_user;
```

---

## 📡 API Reference

### Authentication
| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/register` | Register new user | Public |
| POST | `/api/auth/login` | Login, get JWT | Public |
| GET | `/api/auth/me` | Get current user | JWT |
| POST | `/api/auth/logout` | Logout | JWT |

### Students
| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| GET | `/api/students` | List students | teacher, admin |
| GET | `/api/students/me` | Own profile | student |
| GET | `/api/students/:id` | Student by ID | all |
| GET | `/api/students/:id/overview` | Full dashboard data | all |
| GET | `/api/students/parent/children` | Linked children | parent |

### Assessments
| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| GET | `/api/assessments` | List assessments | all |
| POST | `/api/assessments` | Submit assessment (triggers AI pipeline) | all |
| GET | `/api/assessments/student/:id/timeline` | Progress timeline | all |

### Learning Plans
| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| GET | `/api/learning-plans` | List plans | all |
| POST | `/api/learning-plans/generate` | Generate AI plan | teacher, admin |
| POST | `/api/learning-plans/:id/approve` | Approve plan (HITL) | teacher, admin |
| POST | `/api/learning-plans/:id/reject` | Reject plan (HITL) | teacher, admin |

### Generated Content
| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| GET | `/api/content` | List content | all |
| POST | `/api/content/generate` | Generate AI content | teacher, admin |
| POST | `/api/content/:id/approve` | Approve content (HITL) | teacher, admin |
| POST | `/api/content/:id/reject` | Reject content (HITL) | teacher, admin |

### Analytics
| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| GET | `/api/analytics/class` | Class-wide analytics | teacher, admin |
| GET | `/api/analytics/student/:id` | Student analytics | all |
| GET | `/api/analytics/system` | System analytics | admin |
| GET | `/api/analytics/parent/:studentId` | Parent view | parent |

### Ledger
| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| GET | `/api/ledger` | List ledger records | admin, teacher, parent |
| GET | `/api/ledger/verify` | Verify chain integrity | admin |
| GET | `/api/ledger/verify/:referenceId` | Verify specific record | all |

---

## 🗄️ Database Schema

### Core Tables

| Table | Description |
|-------|-------------|
| `users` | All users (student, teacher, admin, parent) with password hash |
| `students` | Student profiles with grade, learning profile, risk/mastery scores |
| `parent_student_links` | Many-to-many parent-child relationships |
| `assessments` | Quiz/test results with subject, topic, score, time spent |
| `knowledge_graph` | Per-student concept mastery levels and misconceptions |
| `learning_plans` | AI-generated adaptive learning plans with HITL approval |
| `generated_content` | AI-generated worksheets, quizzes, flashcards, etc. |
| `audit_logs` | Complete audit trail of all AI agent actions |
| `ledger_records` | Hash-chained blockchain blocks |
| `achievements` | Student badges with ledger verification |
| `notifications` | In-app notifications for all users |
| `system_config` | Configurable system parameters |

---

## ⛓️ Blockchain Ledger

The EPN uses a **simulated permissioned hash-chained ledger** for tamper-evident record keeping:

- Each block contains: `blockIndex`, `dataHash` (SHA-256 of record data), `previousHash`, `blockHash`
- The `blockHash` is computed from `blockIndex + dataHash + previousHash + timestamp`
- Chain integrity can be verified via `GET /api/ledger/verify`
- Individual records can be verified via `GET /api/ledger/verify/:referenceId`

**Records added to the ledger:**
- Achievement earned
- Learning plan created/approved/rejected
- Content generated/approved/rejected
- Significant AI agent actions

---

## 🛡️ Safety & HITL Workflow

### Human-in-the-Loop (HITL) Approvals
All AI-generated content and learning plans require **teacher approval** before delivery to students:

1. AI generates content/plan → status: `pending`
2. Teacher receives notification
3. Teacher reviews in the Approvals panel
4. Teacher approves (with optional notes) or rejects (with required reason)
5. Approved content becomes visible to students
6. All decisions are logged to audit trail and ledger

### Circuit Breaker
- Each AI agent tracks failure counts
- After 5 consecutive failures, the circuit opens (agent disabled)
- Circuit resets after 60 seconds
- Admin can view circuit status in the Agent Health panel

### RBAC (Role-Based Access Control)
- JWT tokens carry the user's role
- Every API endpoint enforces role-based access
- Students cannot access other students' data
- Parents can only access their linked children's data

### Audit Trail
Every AI action is logged with:
- Agent name, action type, timestamp
- Actor ID (human, if applicable)
- Target entity (student, content, plan)
- Policy version
- IP address

---

## 🔑 Demo Credentials

All demo accounts use password: **`Password123!`**

| Role | Email | Description |
|------|-------|-------------|
| Admin | `admin@epn.edu` | Dr. Sarah Mitchell — full system access |
| Teacher | `teacher@epn.edu` | Mr. James Carter — class management |
| Teacher | `teacher2@epn.edu` | Ms. Emily Rodriguez |
| Student | `student@epn.edu` | Alex Johnson — Grade 9 |
| Student | `student2@epn.edu` | Sofia Garcia — Grade 10 |
| Parent | `parent@epn.edu` | Robert Johnson — linked to Alex |

---

## ⚙️ Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Environment mode |
| `PORT` | `5000` | Backend server port |
| `DB_HOST` | `localhost` | PostgreSQL host |
| `DB_PORT` | `5432` | PostgreSQL port |
| `DB_NAME` | `epn_db` | Database name |
| `DB_USER` | `epn_user` | Database user |
| `DB_PASSWORD` | `epn_password` | Database password |
| `JWT_SECRET` | *(required)* | JWT signing secret — **change in production!** |
| `JWT_EXPIRES_IN` | `24h` | Token expiry duration |
| `OPENAI_API_KEY` | *(empty)* | OpenAI API key — uses mock if not set |
| `OPENAI_MODEL` | `gpt-4o-mini` | OpenAI model to use |
| `FRONTEND_URL` | `http://localhost:3000` | Frontend URL for CORS |
| `DAILY_CONTENT_LIMIT` | `10` | Max AI content generations per student/day |

---

## 📄 Planning Documents

The following planning documents are preserved in the repository root:

- **`EPN_PRD.pdf`** — Product Requirements Document
- **`EPN_Report__1_.pdf`** — Project Report
- **`EPN_Tech_Stack_Specification.pdf`** — Technical Stack Specification

---

## 🏗️ Production Considerations

- Replace `JWT_SECRET` with a cryptographically random 64-byte secret
- Configure a real OpenAI API key for live content generation
- Set up SSL/TLS termination (e.g., via a load balancer or Nginx with Let's Encrypt)
- Use a managed PostgreSQL service (e.g., AWS RDS, Supabase) for production
- Replace the in-memory circuit breaker with Redis for multi-instance deployments
- Configure proper backup strategies for the PostgreSQL database
- Set up monitoring and alerting for the AI agent health endpoints

---

*Built with ❤️ for the EPN Group — Educational Productivity Network*

---

## Getting started (original GitLab template)

To make it easy for you to get started with GitLab, here's a list of recommended next steps.

Already a pro? Just edit this README.md and make it your own. Want to make it easy? [Use the template at the bottom](#editing-this-readme)!

## Add your files

* [Create](https://docs.gitlab.com/user/project/repository/web_editor/#create-a-file) or [upload](https://docs.gitlab.com/user/project/repository/web_editor/#upload-a-file) files
* [Add files using the command line](https://docs.gitlab.com/topics/git/add_files/#add-files-to-a-git-repository) or push an existing Git repository with the following command:

```
cd existing_repo
git remote add origin https://gitlab.com/epn-group/education.git
git branch -M main
git push -uf origin main
```

## Integrate with your tools

* [Set up project integrations](https://gitlab.com/epn-group/education/-/settings/integrations)

## Collaborate with your team

* [Invite team members and collaborators](https://docs.gitlab.com/user/project/members/)
* [Create a new merge request](https://docs.gitlab.com/user/project/merge_requests/creating_merge_requests/)
* [Automatically close issues from merge requests](https://docs.gitlab.com/user/project/issues/managing_issues/#closing-issues-automatically)
* [Enable merge request approvals](https://docs.gitlab.com/user/project/merge_requests/approvals/)
* [Set auto-merge](https://docs.gitlab.com/user/project/merge_requests/auto_merge/)

## Test and Deploy

Use the built-in continuous integration in GitLab.

* [Get started with GitLab CI/CD](https://docs.gitlab.com/ci/quick_start/)
* [Analyze your code for known vulnerabilities with Static Application Security Testing (SAST)](https://docs.gitlab.com/user/application_security/sast/)
* [Deploy to Kubernetes, Amazon EC2, or Amazon ECS using Auto Deploy](https://docs.gitlab.com/topics/autodevops/requirements/)
* [Use pull-based deployments for improved Kubernetes management](https://docs.gitlab.com/user/clusters/agent/)
* [Set up protected environments](https://docs.gitlab.com/ci/environments/protected_environments/)

***

# Editing this README

When you're ready to make this README your own, just edit this file and use the handy template below (or feel free to structure it however you want - this is just a starting point!). Thanks to [makeareadme.com](https://www.makeareadme.com/) for this template.

## Suggestions for a good README

Every project is different, so consider which of these sections apply to yours. The sections used in the template are suggestions for most open source projects. Also keep in mind that while a README can be too long and detailed, too long is better than too short. If you think your README is too long, consider utilizing another form of documentation rather than cutting out information.

## Name
Choose a self-explaining name for your project.

## Description
Let people know what your project can do specifically. Provide context and add a link to any reference visitors might be unfamiliar with. A list of Features or a Background subsection can also be added here. If there are alternatives to your project, this is a good place to list differentiating factors.

## Badges
On some READMEs, you may see small images that convey metadata, such as whether or not all the tests are passing for the project. You can use Shields to add some to your README. Many services also have instructions for adding a badge.

## Visuals
Depending on what you are making, it can be a good idea to include screenshots or even a video (you'll frequently see GIFs rather than actual videos). Tools like ttygif can help, but check out Asciinema for a more sophisticated method.

## Installation
Within a particular ecosystem, there may be a common way of installing things, such as using Yarn, NuGet, or Homebrew. However, consider the possibility that whoever is reading your README is a novice and would like more guidance. Listing specific steps helps remove ambiguity and gets people to using your project as quickly as possible. If it only runs in a specific context like a particular programming language version or operating system or has dependencies that have to be installed manually, also add a Requirements subsection.

## Usage
Use examples liberally, and show the expected output if you can. It's helpful to have inline the smallest example of usage that you can demonstrate, while providing links to more sophisticated examples if they are too long to reasonably include in the README.

## Support
Tell people where they can go to for help. It can be any combination of an issue tracker, a chat room, an email address, etc.

## Roadmap
If you have ideas for releases in the future, it is a good idea to list them in the README.

## Contributing
State if you are open to contributions and what your requirements are for accepting them.

For people who want to make changes to your project, it's helpful to have some documentation on how to get started. Perhaps there is a script that they should run or some environment variables that they need to set. Make these steps explicit. These instructions could also be useful to your future self.

You can also document commands to lint the code or run tests. These steps help to ensure high code quality and reduce the likelihood that the changes inadvertently break something. Having instructions for running tests is especially helpful if it requires external setup, such as starting a Selenium server for testing in a browser.

## Authors and acknowledgment
Show your appreciation to those who have contributed to the project.

## License
For open source projects, say how it is licensed.

## Project status
If you have run out of energy or time for your project, put a note at the top of the README saying that development has slowed down or stopped completely. Someone may choose to fork your project or volunteer to step in as a maintainer or owner, allowing your project to keep going. You can also make an explicit request for maintainers.
