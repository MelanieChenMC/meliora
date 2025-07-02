# Meliora

A real-time audio transcription and AI-powered session management platform that provides live transcription, intelligent suggestions, and automated summaries.

## Features

- **Real-time Audio Transcription**: Live audio processing and transcription
- **AI-Powered Suggestions**: Generate intelligent suggestions based on session content
- **Session Management**: Organize and manage transcription sessions
- **Automated Summaries**: AI-generated summaries of sessions
- **User Authentication**: Secure user management with Clerk
- **Real-time Updates**: Live transcription using browser MediaRecorder API

## Tech Stack

### Backend
- **Next.js** - Full-stack React framework
- **Prisma** - Database ORM
- **Supabase** - Database and backend services
- **Clerk** - Authentication and user management

### Frontend
- **React** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Custom hooks** - Real-time transcription management

## Project Structure

```
meliora/
├── backend/           # Next.js API and server-side logic
│   ├── app/api/      # API routes
│   ├── lib/          # Utility functions and configurations
│   └── prisma/       # Database schema
├── ui/               # React frontend application
│   └── src/
│       ├── components/   # React components
│       └── hooks/       # Custom React hooks
└── setup.sql        # Database setup scripts
```

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- PostgreSQL database
- Supabase account
- Clerk account

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd meliora
   ```

2. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd ../ui
   npm install
   ```

4. **Set up environment variables**
   
   Create `.env.local` files in both `backend/` and `ui/` directories with the necessary environment variables:
   
   ```bash
   # Backend .env.local
   DATABASE_URL="your-database-connection-string"
   SUPABASE_URL="your-supabase-url"
   SUPABASE_ANON_KEY="your-supabase-anon-key"
   CLERK_SECRET_KEY="your-clerk-secret-key"
   ```

5. **Set up the database**
   ```bash
   cd backend
   npx prisma migrate dev
   npx prisma generate
   ```

6. **Run database setup (if needed)**
   ```bash
   # Execute setup.sql in your PostgreSQL database
   ```

### Development

1. **Start the backend server**
   ```bash
   cd backend
   npm run dev
   ```

2. **Start the frontend development server**
   ```bash
   cd ui
   npm start
   ```

3. **Access the application**
   - Frontend: `http://localhost:3000`
   - Backend API: `http://localhost:3001` (or configured port)

## API Endpoints

- `GET /api/health` - Health check
- `POST /api/transcribe` - Audio transcription
- `GET /api/sessions` - List sessions
- `POST /api/sessions` - Create new session
- `GET /api/sessions/[id]` - Get session details
- `POST /api/sessions/[id]/suggestions` - Generate AI suggestions
- `GET /api/sessions/[id]/summary` - Get session summary
- `GET /api/sessions/[id]/transcriptions` - Get session transcriptions

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support, please open an issue in the GitHub repository or contact the development team. 