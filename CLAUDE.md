# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Meliora is a real-time audio transcription and AI-powered session management platform for social workers. It features:
- Real-time audio transcription with noise gate processing
- AI-powered suggestions based on session content
- Session management with three scenario types: in_person, call_center, conference
- Automated AI-generated summaries

## Architecture

### Backend (Next.js)
- Located in `/backend` directory
- API routes in `app/api/` using Next.js App Router
- Database: PostgreSQL with Prisma ORM
- Key services: Clerk (auth), Supabase, OpenAI

### Frontend (React)
- Located in `/ui` directory
- React 18 with TypeScript and React Router v6
- Styling with Tailwind CSS
- Real-time transcription using browser MediaRecorder API

## Common Commands

### Backend Development
```bash
cd backend
npm run dev      # Start dev server on port 3001
npm run build    # Build for production
npm run lint     # Run linter
npx prisma migrate dev  # Run database migrations
npx prisma generate     # Generate Prisma client
```

### Frontend Development
```bash
cd ui
npm start        # Start dev server (default port 3000)
npm run build    # Create production build
```

## Key Implementation Details

### Audio Processing
The application uses advanced audio processing with a noise gate to prevent transcription hallucinations:
- Real-time chunked processing (3-second chunks by default)
- Noise gate threshold monitoring
- Comprehensive audio metrics logging
- Implementation in `ui/src/hooks/useRealTimeTranscription.ts`

### API Structure
- Health check: `/api/health`
- Sessions: `/api/sessions` (CRUD operations)
- Transcription: `/api/transcribe` (audio processing)
- Test connection: `/api/test-connection`

### Database Models (Prisma)
- `Session`: Main session tracking
- `Transcription`: Audio transcription records
- `AiSuggestion`: AI-generated suggestions
- `SessionSummary`: AI-generated session summaries

### Authentication Flow
All routes use Clerk authentication. The middleware checks for authenticated users and retrieves user information from Clerk.

### Real-time Updates
Real-time audio recording is handled client-side using the browser's MediaRecorder API. Audio chunks are sent to the backend for transcription using OpenAI Whisper.

## Development Notes

1. CORS is configured to allow frontend-backend communication
2. Environment variables are required for all external services
3. The frontend proxy is configured in package.json to route API calls to the backend
4. Audio processing includes detailed logging for debugging transcription issues