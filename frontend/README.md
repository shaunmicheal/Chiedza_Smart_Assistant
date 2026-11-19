# Chiedza Smart Assistant — Frontend

This is the React frontend for Chiedza Smart Assistant. It is built with Vite and communicates with the Express backend through the API client in `src/lib/api.js`.

## Requirements

- Node.js
- npm
- A running Chiedza backend API

## Install

```bash
npm install
```

## Environment

Create a local environment file:

```bash
cp .env.example .env.local
```

Set `VITE_API_URL` to the backend API base URL. For local development:

```text
VITE_API_URL=http://localhost:5000/api
```

For deployment, set the same variable in the frontend hosting dashboard to the production API URL, including `/api`.

Only public configuration belongs in Vite environment variables. Never place database credentials, JWT secrets or private API keys in this frontend project.

## Development

```bash
npm run dev
```

Vite normally serves the app at `http://localhost:5173`.

## Production build

```bash
npm run build
```

The production build is written to `dist/`.

Preview the production build locally:

```bash
npm run preview
```

## Lint

```bash
npm run lint
```

## Application areas

- Administrator workspace: school setup, staff, classes, learners, records and alert rules.
- Teacher workspace: assigned classes, learners, attendance, assessments, early warnings and parent communication drafts.
- Parent workspace: linked learners, attendance, academic progress and approved school messages.

The frontend uses role-aware routes, but the backend remains responsible for enforcing data access and permissions.
