# 🎙️ Echo Voice Agent - Frontend (Next.js)

This is the frontend interface for the **Echo Voice Agent** (AI Meeting Intelligence Engine). It provides a secure, modern UI for users to authenticate, upload meeting audio, view transcriptions, and interact with an AI assistant using both text and voice.

## ✨ Features

- **Secure Authentication:** 
  - Email/Password Signup with OTP (One-Time Password) email verification.
  - Google OAuth 2.0 integration for one-click login.
  - JWT (JSON Web Token) based session management.
- **Protected Routes:** Users must be authenticated to upload audio or chat with meetings.
- **Audio Upload:** A clean interface to upload meeting audio files (`.mp3`, `.wav`, `.mp4`).
- **Real-time Status Polling:** Automatically polls the backend to show transcription progress.
- **RAG Chat Interface:** A chat UI to ask questions based on the meeting transcript.
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

## 🚀 Getting Started

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Environment

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_API_URL=https://nursery-tell-julie-transcription.trycloudflare.com/api
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-google-oauth-client-id.apps.googleusercontent.com
```

The Google client ID is optional when only email/password authentication is needed.

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

## Production

```bash
pnpm run typecheck
pnpm run build
pnpm start
```
