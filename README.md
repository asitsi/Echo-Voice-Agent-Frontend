# 🎙️ Echo Voice Agent — Frontend

A responsive Next.js interface for the Echo Voice Agent meeting-intelligence platform. Users can authenticate, upload a recording, follow transcription progress, review the returned transcript or summary, and ask questions grounded in the meeting.

This repository contains **frontend code only**. The browser communicates directly with the separately deployed Node.js/Express API—there are no Next.js API routes or backend services in this project.

## Features

- Email/password registration with six-digit OTP verification
- Email/password login and Google OAuth
- JWT-protected uploads, meeting requests, and chat requests
- Drag-and-drop audio/video upload
- Automatic meeting-status polling while transcription is processing
- Transcript and optional AI-summary views populated from real API data
- Transcript search and copy controls
- RAG chat scoped to the selected meeting
- Browser speech recognition for voice questions
- Browser text-to-speech for AI answers
- Recent-meetings menu for returning to a completed upload
- Responsive desktop and mobile interface

## Tech stack

- Next.js 16 with the App Router
- React 19
- TypeScript
- Tailwind CSS 4
- `@react-oauth/google`
- Lucide React
- Browser Fetch, Web Speech, and Speech Synthesis APIs

## How the frontend connects

```text
Browser (Next.js frontend)
        │
        │ HTTPS + JWT Authorization header
        ▼
Node.js / Express API
        │
        ├── authentication
        ├── upload and transcription queue
        ├── meeting status and transcript
        └── meeting RAG chat
```

The API base URL is read from `NEXT_PUBLIC_API_URL`. It must include the `/api` suffix, for example:

```env
NEXT_PUBLIC_API_URL=https://your-api-domain.example.com/api
```

Because requests are sent directly from the browser, the Express backend must allow the frontend origin through CORS, such as `http://localhost:3000` during development and the production frontend domain after deployment.

## Getting started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Create `.env.local`

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_API_URL=https://your-api-domain.example.com/api
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

`NEXT_PUBLIC_GOOGLE_CLIENT_ID` is only required for Google sign-in. Email/password authentication can work without it.

> Variables prefixed with `NEXT_PUBLIC_` are included in the browser bundle. Never put private secrets, Google client secrets, or backend JWT secrets in this file.

### 3. Start development

```bash
pnpm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Restart the development server after changing `.env.local`.

## Authentication flow

### Email registration

1. The frontend sends `name`, `email`, and `password` to `POST /api/auth/signup`.
2. The user enters the six-digit OTP.
3. The frontend sends `email` and `otp` to `POST /api/auth/verify-otp`.
4. The returned JWT is saved in `localStorage`.

### Email login

The frontend sends `email` and `password` to `POST /api/auth/login`, then saves the returned JWT.

### Google login

Google Identity Services returns an ID token to the frontend. The frontend sends it as `{ "idToken": "..." }` to `POST /api/auth/google`. The backend verifies it and returns the application JWT.

For local Google login, configure the OAuth client as a **Web application** and add this Authorized JavaScript origin in Google Cloud Console:

```text
http://localhost:3000
```

Also add the exact production frontend origin when deploying. Do not add `/api`, a route, or a trailing path to an Authorized JavaScript origin.

## API endpoints

All paths below are relative to `NEXT_PUBLIC_API_URL`.

| Method | Endpoint | Authentication | Purpose |
| --- | --- | --- | --- |
| `POST` | `/auth/signup` | Public | Create an account and send an OTP |
| `POST` | `/auth/verify-otp` | Public | Verify the OTP and receive a JWT |
| `POST` | `/auth/login` | Public | Sign in and receive a JWT |
| `POST` | `/auth/google` | Public | Exchange a Google ID token for a JWT |
| `POST` | `/upload` | Bearer JWT | Upload a recording and start processing |
| `GET` | `/meeting/:id` | Bearer JWT | Read status, transcript, and summary |
| `POST` | `/meeting/:id/chat` | Bearer JWT | Ask a question about the meeting |

Protected requests include:

```http
Authorization: Bearer <JWT>
```

### Upload request

The upload request uses `multipart/form-data` with one field:

| Field | Type | Required | Description |
| --- | --- | --- | --- |
| `audio` | File | Yes | MP3, WAV, M4A, MP4, or another backend-supported recording |

The browser sets the multipart boundary automatically, so the frontend intentionally does not set a manual `Content-Type` header for uploads.

Expected response:

```json
{
  "message": "Processing started.",
  "meetingId": "0ea9283b-5948-4d28-b3e1-4502c997af4e"
}
```

After upload, the frontend polls `GET /meeting/:id` until the status is `completed`, `complete`, `processed`, or `ready`. Failed/error statuses stop polling and display an error.

### Chat request

```json
{
  "question": "What were the key decisions?"
}
```

Expected response:

```json
{
  "answer": "The team decided to..."
}
```

## Returning to a previous meeting

After a meeting finishes processing, the frontend saves only its ID, title, and creation date in browser storage for the signed-in user.

1. Click **New meeting** to clear the current workspace and upload another recording.
2. Click **Meetings** in the header.
3. Select a recent meeting.
4. The frontend securely refetches it from `GET /meeting/:id` using the current JWT.

Transcript and summary content are not stored in the local meeting-history index.

The current backend API does not provide a meeting-list endpoint, so this history is limited to completed meetings uploaded from the same browser. To synchronize history across devices, add a protected `GET /api/meetings` endpoint and use its response instead of the local index.

## Available commands

```bash
pnpm run dev        # Start the development server
pnpm run typecheck  # Run TypeScript checks
pnpm run build      # Create a production build with webpack
pnpm start          # Start the production server
```

Before deployment, run:

```bash
pnpm run typecheck
pnpm run build
```

## Project structure

```text
app/
├── globals.css               # Global styles and responsive layout
├── layout.tsx                # Root application layout
└── page.tsx                  # Auth state, upload/polling, and meeting history
components/
├── auth-modal.tsx            # Email, OTP, and Google authentication
├── brand-mark.tsx            # Echo brand mark
├── meeting-workspace.tsx     # Transcript, summary, chat, and speech controls
└── upload-card.tsx           # Locked, ready, uploading, and error states
hooks/
└── use-speech.ts             # Browser text-to-speech helper
types/
└── meeting.ts                # Shared meeting and chat types
```

## Troubleshooting

### Upload or authentication is blocked by CORS

Confirm that the Express API allows the exact frontend origin. An HTTP `500` response is a backend failure, even if DevTools also mentions cross-origin behavior; inspect the response body and backend logs.

### Google reports `Error 401: invalid_client` or `no registered origin`

- Use a Google OAuth client with type **Web application**.
- Add `http://localhost:3000` to Authorized JavaScript origins.
- Make sure `.env.local` contains the same client ID configured on the backend.
- Restart `pnpm run dev` after changing the environment variable.

### A previous meeting is missing

Only meetings completed in the current browser after the history feature was enabled are available locally. Cross-device or complete account history requires a backend meeting-list endpoint.

### Voice controls do not work

Speech recognition and speech synthesis availability varies by browser. Use a current Chromium-based browser for the broadest support and allow microphone access when prompted.
