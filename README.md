# CriptNote

A modern note-taking app with code syntax highlighting support. Built with React, TypeScript, Vite, Tailwind CSS, and Supabase.

## Features

- **Authentication** - Email/password signup, magic link login via Supabase Auth
- **Note Types** - Basic text notes and code snippets (Java, JavaScript, Python, SQL)
- **Syntax Highlighting** - Code notes rendered with highlight.js
- **Dark/Light Mode** - Toggle with localStorage persistence
- **Real-time Updates** - Supabase Realtime subscriptions for instant sync
- **Responsive Design** - Clean, minimal UI inspired by Notion

## Tech Stack

- **Frontend**: React + Vite + TypeScript
- **Backend**: Supabase (Auth, PostgreSQL, Realtime, RLS)
- **Styling**: Tailwind CSS
- **Code Highlighting**: highlight.js
- **Routing**: React Router

## Setup

### Prerequisites

- Node.js 18+
- A Supabase project

### Installation

```bash
git clone https://github.com/ramiz7171/criptnote.git
cd criptnote
npm install
```

### Environment Variables

Create a `.env` file in the project root:

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Database Setup

Run these migrations in your Supabase SQL editor (in order):

1. Create the `note_type` enum
2. Create the `profiles` table with RLS policies
3. Create the `notes` table with RLS policies
4. Enable realtime and create auto-profile trigger

See the Supabase dashboard for the applied migrations.

### Run Development Server

```bash
npm run dev
```

### Build for Production

```bash
npm run build
```

## Project Structure

```
src/
  components/
    Auth/         # Login/signup form
    Layout/       # Top navigation bar
    Notes/        # New note modal
    Sidebar/      # Left sidebar with note lists
    Editor/       # Note viewer/editor with syntax highlighting
  hooks/          # useNotes hook with CRUD + realtime
  lib/            # Supabase client
  context/        # Auth and Theme providers
  types/          # TypeScript types
  pages/          # AuthPage and Dashboard
  App.tsx         # Router setup
  main.tsx        # Entry point
```
