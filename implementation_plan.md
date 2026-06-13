# Cognitive Profiling & Adaptive Architecture - Implementation Plan

This document outlines the systematic implementation of the 20 AI-driven features described in the EPN platform design document. The architecture emphasizes zero mock data, relying entirely on live Postgres queries and AI integrations.

## Phase 1: Foundation & Micro-Interactions (Completed)

We have successfully initialized the database schema and built the first set of functional features:

### 1. Database Schema Migration (`002_cognitive_profiling_schema.sql`)
The live Postgres database has been updated with tables to support the adaptive architecture:
- `student_mood_logs`: Tracks daily energy and emotional states.
- `micro_tasks`: Breaks large assignments into 5-minute actionable steps.
- `spaced_repetition_items`: Handles memory decay algorithms.
- `study_sessions` & `behavioral_events`: Stores focus heatmaps and session data.
- `social_contracts`: Manages peer accountability pledges.
- `growth_circles`: Handles gamified peer groups.

### 2. Emotional State and Mood Check-Ins (Feature 2)
- **Backend:** `GET /api/cognitive/mood` and `POST /api/cognitive/mood` implemented.
- **Frontend:** Integrated a `Mood Check-In Modal` directly into the `StudentDashboard.tsx`. It automatically intercepts the user if they haven't logged their mood for the day, adapting the UI's context based on their energy levels.

### 3. Frictionless Micro-Tasking Engine (Feature 4 & 18)
- **Backend:** `GET /api/cognitive/micro-tasks` and `POST /api/cognitive/micro-tasks/complete/:id` implemented.
- **Frontend:** Added an "Adaptive Bite-Sized Micro-Tasks" panel to the dashboard. It fetches live, uncompleted micro-tasks and allows one-click completion. Tasks tagged with `is_low_friction` are prioritized on low-energy days.

---

## Phase 2: Knowledge Graph & Spaced Repetition (Next Steps)

### Spaced Repetition Micro-Scheduling (Feature 3)
- **Algorithm:** Implement the SuperMemo-2 (SM-2) algorithm on the backend.
- **API:** Create `GET /api/cognitive/spaced-repetition/due` to fetch items whose `next_review_at` is past due.
- **UI:** A floating "Review Time" widget that pops up 2-minute flashcard quizzes right before the memory decay threshold is reached.

### Mastery-Based Knowledge Graph Routing (Feature 16)
- **Implementation:** Utilize the existing `knowledge_graph` table. Build a background cron job (`node-cron`) that recalculates the shortest path to fix a student's lowest `mastery_level` nodes.
- **UI:** A visual graph node mapper (using `react-flow-renderer`) in the Progress page showing exact conceptual gaps.

---

## Phase 3: Engagement & Behavioral Analysis

### Non-Intrusive Behavioral Heatmaps & Focus-Window Optimization (Features 7 & 10)
- **Frontend Tracking:** Create a React hook `useBehaviorTracker` that listens to `mousemove`, `scroll`, and `click` events at a throttled rate (e.g., 5 seconds) and sends aggregated data to `POST /api/cognitive/behavioral-events`.
- **Backend Analytics:** Calculate `focus_score` and identify peak cognitive hours ("golden hours").
- **UI Nudges:** Render specific subjects automatically into the student's calendar during their optimal focus window.

### Asynchronous "Body Doubling" Virtual Rooms (Feature 5)
- **WebSocket:** Implement Socket.io for live presence.
- **UI:** A side-panel showing "Peers currently studying" with silent avatars and live "focusing" status indicators.

### Gamified Skill-Tree Progression Maps (Feature 8)
- **UI Integration:** Replace traditional grade charts with an interactive skill tree where completed subjects unlock new branches.

---

## Phase 4: AI & Peer Accountability

### Contextual Real-World Analogy Generator (Feature 12)
- **Backend:** Create `POST /api/cognitive/analogy`. It will take a difficult concept, combine it with the student's `learning_profile` interests (e.g., "Soccer", "Gaming"), and query the OpenAI API to return a personalized explanation.

### Social Contract Commitment Pledges & Growth Circles (Features 9 & 14)
- **API:** Build endpoints to invite peers to `growth_circles` and create `social_contracts`.
- **Logic:** If a student completes their daily `micro_tasks`, the contract is marked `fulfilled` and all members of the growth circle receive a notification.

### Smart Distraction Interception Shields (Feature 13)
- **Implementation:** This requires a browser extension to intercept URL changes, but can be simulated in-app by detecting tab visibility (`document.hidden`) and popping a modal ("Stay focused! You're almost done with this task") if they return after navigating away.

---

**Note:** The system architecture is built entirely without mock data. All components rely on actual database records and dynamic API routes designed in `backend/src/routes/cognitive.js` and `backend/src/db/migrations/002_cognitive_profiling_schema.sql`.
