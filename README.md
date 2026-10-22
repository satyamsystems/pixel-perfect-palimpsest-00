# Trajectify.AI

> **Simulate your future. Decide today.**

Trajectify.AI is a predictive decision platform and adaptive goal simulation engine. It models career and skill paths across multiple dimensions, visualizes live "What-If" trade-offs, generates personalized month-by-month roadmaps, and keeps students and professionals on track through weekly check-ins and AI-powered adjustments.

---

## Key Features

1. **Personal Profile Engine & Onboarding**
   - Goal domain modeling (Career/Skills, Fitness, Finance, Habits)
   - Interactive skill chip matrix with proficiency sliders
   - Available weekly commitment modeling
   - Profile strength score calculation

2. **What-If Scenario Simulator**
   - Live adjustments for study/work hours and start delay
   - Multi-path probability and skill trajectory comparisons
   - Risk and momentum evaluation

3. **Adaptive AI Roadmap**
   - Timeline and Gantt view modes
   - Monthly outcomes, checklist milestones, and curated learning resources
   - Dynamic trajectory recalibration

4. **Weekly "My Check-In" & Adaptive Feedback Loop**
   - Track hours invested, completed milestones, blockers, and mood (5-point scale)
   - AI-driven suggestions for roadmap optimization (move, add, re-time milestones)
   - Granular review screen with Accept/Reject diffs per change

5. **Trajectify AI Assistant**
   - Grounded context from the active user's actual profile, roadmap, and recent check-ins
   - Streamlined chat experience with suggested inquiry chips, clipboard copy, and retry states
   - Supported by Google Gemini and OpenAI-compatible endpoints with graceful local intelligence fallback

6. **Authentication & Session Management**
   - Dual authentication tabs: Email/Password and Mobile OTP (with 30s resend timer and demo OTP verification)
   - Protected routes and persistent session management
   - Prepared for integration with PHP + MySQL REST backend

---

## Tech Stack

- **Framework**: React 19 + TypeScript + TanStack Start (SSR & Nitro server engine)
- **Routing**: TanStack Router (file-based route tree)
- **Styling**: Tailwind CSS v4 + Custom Design Tokens (Warm Earth & Deep Teal identity)
- **Components**: Radix UI primitives + Lucide Icons + Sonner Toasts
- **Charts**: Recharts (accessible radar, bar, line, and custom gauge visualizers)
- **State & Data Layer**: Modular service architecture (`src/services/*`) backed by `localStorage`

---

## Getting Started

### Prerequisites

- Node.js (v18+ or v20+)
- npm or bun

### 1. Installation

```bash
npm install
```

### 2. Configure Environment Variables

Copy the example environment configuration:

```bash
cp .env.example .env
```

Set your API key if you want live LLM responses:

```env
VITE_GEMINI_API_KEY="your-gemini-api-key"
```

_(Note: If no API key is provided, the Assistant and Check-In features automatically use the local profile intelligence engine.)_

### 3. Run Locally

```bash
npm run dev
```

The application runs at `http://localhost:3000` (or the port specified by Vite/Nitro).

### 4. Build for Production

```bash
npm run build
npm run preview
```

---

## Logo Replacement

The brand logo and favicon are located at:

- **Logo**: `public/logo.svg`
- **Favicon**: `public/favicon.svg`

You can replace these files directly with your customized SVGs or PNGs without modifying any code.
