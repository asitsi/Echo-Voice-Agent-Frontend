# 🎙️ Echo Voice Agent - Frontend (Next.js)

This is the frontend interface for the **Echo Voice Agent** (AI Meeting Intelligence Engine). It provides a secure, modern UI for users to authenticate, upload meeting media or documents, view processed content, and interact with an AI assistant using both text and voice.

## ✨ Features

- **Secure Authentication:** 
  - Email/Password Signup with OTP (One-Time Password) email verification.
  - Google OAuth 2.0 integration for one-click login.
  - JWT (JSON Web Token) based session management.
- **Protected Routes:** Users must be authenticated to upload files or chat with meetings.
- **File Upload:** Supports `audio/*`, `video/*`, `.pdf`, `.txt`, `.md`, and `.csv` files up to 500 MB.
- **Real-time Status Polling:** Automatically polls the backend to show transcription progress.
- **RAG Chat Interface:** A streaming chat UI with Markdown-formatted answers grounded in the meeting transcript.
- **Dynamic Chat Prompts:** Displays backend-generated suggested questions for each processed meeting.
- **Voice-to-Voice (TTS):** Utilizes the browser's native Web Speech API to read the AI's answers out loud.
- **Modern UI:** Built with Tailwind CSS for a responsive, dark-mode-first experience.

## 💻 Tech Stack

- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Auth Integration:** `@react-oauth/google` (for Google Login) & Fetch API
- **Text-to-Speech:** Web Speech API (Browser Native)

## 🔗 Backend Requirement

This is a frontend-only Next.js application. It calls the separately deployed `echo-api` service directly from the browser and does not create any Next.js API routes.

Browser API requests are centralized in `services/echo-api.ts`. This is a frontend fetch client—not a Next.js backend route—and contains authentication, upload, meeting retrieval, and streamed-chat request handling.

### Frontend structure

```text
app/page.tsx                     Server-rendered route and request-time greeting
components/echo-dashboard.tsx   Client dashboard island for browser interactions
components/app-header.tsx        Header, profile, and recent meetings UI
components/meeting-workspace.tsx Transcript and summary workspace
components/meeting-chat-panel.tsx Chat layout
components/chat-message.tsx      Markdown message rendering
hooks/use-echo-dashboard.ts       Session, upload, polling, and meeting state
hooks/use-meeting-chat.ts         Chat streaming, history, voice, and TTS state
hooks/use-toast.ts                Toast lifecycle
services/echo-api.ts              All browser API requests
utils/meeting-content.ts          Transcript and streamed-content formatting
utils/session-storage.ts          Local session and meeting-history storage
types/                             Centralized API, UI, browser, storage, and domain types
```

## 🚀 Getting Started

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Environment

Copy the safe placeholder file and add your actual deployment values:

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_API_URL=https://your-backend-domain.example.com/api
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

`NEXT_PUBLIC_API_URL` is required and must include the `/api` suffix. The Google client ID is optional when only email/password authentication is needed. `.env.local` is ignored by Git and must not be committed.

For Vercel, add both values under **Project Settings → Environment Variables**, select the required environments, and redeploy. `NEXT_PUBLIC_*` values are embedded during the frontend build, so changing them requires a new deployment.

### 3. Start Development

```bash
pnpm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## 🔐 Authentication API

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `POST` | `/api/auth/signup` | Register and send an OTP |
| `POST` | `/api/auth/verify-otp` | Verify email and receive a JWT |
| `POST` | `/api/auth/login` | Sign in and receive a JWT |
| `POST` | `/api/auth/google` | Exchange a Google ID token for a JWT |

The JWT is stored in `localStorage` and attached to protected requests as:

```http
Authorization: Bearer <token>
```

Protected requests include upload, meeting status polling, and meeting chat.

Meeting chat requests send the latest 20 real conversation messages along with the new question:

```json
{
  "question": "What should happen next?",
  "history": [
    { "role": "user", "text": "What was the main decision?" },
    { "role": "ai", "text": "The team decided to launch the beta." }
  ]
}
```

The chat endpoint returns a plain-text event stream. The frontend requests `text/event-stream`, reads it through `response.body.getReader()`, and updates the AI message as chunks arrive. Content inside `<think>...</think>` is replaced with a `Thinking...` state and is excluded from both the visible answer and text-to-speech. Answers remain silent until the user clicks the speaker icon on a completed AI message. The welcome message and failed-request notices are UI-only and are not included in `history`.

## Production

```bash
pnpm run typecheck
pnpm run build
pnpm start
```
