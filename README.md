# Chiedza Smart Assistant

**A School Management and Learning Support Platform for ECD and Primary Schools**

Chiedza Smart Assistant is a role-based school management and learning-support platform designed for private Early Childhood Development (ECD) and primary schools.

The platform brings school administration, learner records, attendance, assessments, early-warning workflows and parent communication into one application.

Its goal is to help schools organise administrative activities, monitor learner progress and strengthen communication between teachers and parents.

The project is being developed as a startup concept with a proposed local school pilot. No school partnership or pilot approval is implied.

**Built with:** React, Node.js, Express, PostgreSQL and Prisma.

---

## Overview

Schools need reliable ways to manage learner information, monitor attendance and academic performance, and communicate effectively with parents.

Chiedza provides a shared digital workspace for these activities.

Its early-warning functionality evaluates supported attendance and assessment patterns to identify potential learner concerns. Authorised staff can review alerts and prepare parent communication drafts in English or Shona.

AI-generated communication remains a draft until an authorised staff member reviews and approves it. The system is designed to support staff judgement rather than replace it.

The parent portal provides access to information associated with verified parent–learner relationships.

## Features

### School Administration

- School and class management.
- Learner registration and management.
- Teacher management and class assignments.
- Parent and guardian account management.
- Role-based access to school resources.
- Learner activation and deactivation.

### Attendance and Academic Progress

- Record and review learner attendance.
- Create assessments and record results.
- Review learner academic performance.
- Identify supported repeated-absence and academic-decline patterns.

### Early-Warning Workflows

- Repeated-absence alerts.
- Academic-decline alerts.
- Alert review and status management by authorised staff.

### Parent Communication

- Generate communication drafts in English and Shona.
- Review and approve generated drafts.
- Keep unapproved drafts separate from parent-visible messages.
- Display approved messages in the parent portal.

### Parent and Guardian Portal

- View linked learners.
- Review attendance information.
- View assessment results and academic progress.
- Read approved school messages.

### Parent Onboarding

Two onboarding methods are supported:

1. **Administrator-created accounts:** An administrator creates a parent account and provides temporary credentials. The parent must change the temporary password.
2. **Invitation-based activation:** An administrator creates a secure, single-use invitation for a specified email address and learner. The parent uses the invitation code to activate an account.

Invitation codes are currently shared manually. Automatic invitation email delivery is not implemented.

### Learner Lifecycle Management

Learners can be deactivated and reactivated without permanently deleting their records.

Deactivation:

- Preserves learner details and historical records.
- Hides the learner from the parent portal.
- Revokes pending parent invitations.
- Prevents new attendance and assessment entries.
- Excludes inactive learners from early-warning evaluation.

Reactivation restores access through existing verified parent relationships.

## User Roles

| Role | Responsibilities |
|---|---|
| School Administrator | Manages school records, classes, teachers, learners, parents and school-level operations. |
| Teacher | Works with assigned classes and the learner records permitted by those assignments. |
| Parent/Guardian | Views information belonging to verified relationships with active learners. |

Access restrictions are enforced by the backend. Frontend page or button visibility is not a substitute for server-side authorisation.

## Technology Stack

| Area | Technology |
|---|---|
| Frontend | React |
| Build Tool | Vite |
| Routing | React Router |
| Styling | CSS |
| Icons | Lucide React |
| Charts | Recharts |
| Backend | Node.js and Express |
| Database | PostgreSQL |
| ORM | Prisma |
| Authentication | JSON Web Tokens (JWT) |
| Validation | Zod |
| Password Hashing | bcryptjs |
| Testing | Vitest and Supertest |
| AI-Assisted Drafts | OpenAI API |
| Frontend Hosting | Vercel |
| Backend Hosting | Render |
| Database Hosting | Neon |

## Architecture

Chiedza uses a separate frontend and backend.

```text
Administrator / Teacher / Parent
              |
              v
       React + Vite
         Frontend
              |
        HTTPS / REST API
              |
              v
       Node.js + Express
           Backend
              |
     Authentication and
        Authorisation
              |
      Application Services
              |
         Prisma ORM
              |
              v
         PostgreSQL
```

The frontend communicates with the backend through a REST API. The backend validates requests, enforces access controls and manages database operations.

OpenAI integration runs on the backend. Private API keys must never be placed in frontend environment variables.

## Repository Structure

```text
Chiedza_Smart_Assistant/
├── backend/
│   ├── prisma/
│   │   ├── migrations/
│   │   └── schema.prisma
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── validators/
│   │   └── tests/
│   ├── API_CONTRACT.md
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── lib/
│   │   ├── pages/
│   │   └── routes/
│   ├── .env.example
│   └── package.json
└── README.md
```

---

## Prerequisites

Install the following before setting up the project.

| Requirement | Recommendation |
|---|---|
| Git | Current stable release |
| Node.js | Node.js 24 LTS |
| npm | Included with Node.js |
| PostgreSQL | PostgreSQL 15+ or hosted Neon database |
| Code Editor | Visual Studio Code or another editor |
| Internet | Required for dependency installation and hosted services |

Node.js 24 LTS is the recommended baseline.

You do not need a local PostgreSQL installation if you use Neon.

## Installation

Choose the instructions for your operating system.

### Linux

The following instructions cover Ubuntu/Debian, Fedora and Arch Linux.

#### Ubuntu / Debian

Install Git and curl:

```bash
sudo apt update
sudo apt install -y git curl
```

Install Node Version Manager (nvm):

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
```

Close and reopen your terminal, then run:

```bash
nvm install 24
nvm use 24
```

Verify the installation:

```bash
node --version
npm --version
git --version
```

#### Fedora

Install Git and curl:

```bash
sudo dnf install -y git curl
```

Install nvm:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
```

Restart your terminal and install Node.js:

```bash
nvm install 24
nvm use 24
```

Verify:

```bash
node --version
npm --version
git --version
```

#### Arch Linux

Update your system and install Git and curl:

```bash
sudo pacman -Syu
sudo pacman -S --needed git curl
```

Install nvm:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
```

Restart your terminal:

```bash
nvm install 24
nvm use 24
```

Verify:

```bash
node --version
npm --version
git --version
```

#### Clone the Project

```bash
git clone https://github.com/shaunmicheal/Chiedza_Smart_Assistant.git
cd Chiedza_Smart_Assistant
```

### macOS

#### Install Developer Tools

Open Terminal and install Apple's command-line developer tools:

```bash
xcode-select --install
```

Install Homebrew if it is not already available, following its official installation instructions.

Install Git:

```bash
brew install git
```

Install nvm:

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
```

Restart Terminal and install Node.js:

```bash
nvm install 24
nvm use 24
```

Verify:

```bash
node --version
npm --version
git --version
```

#### Clone the Project

```bash
git clone https://github.com/shaunmicheal/Chiedza_Smart_Assistant.git
cd Chiedza_Smart_Assistant
```

### Windows

These instructions apply to Windows 10 and Windows 11.

#### Install Git

1. Visit https://git-scm.com/download/win.
2. Download Git for Windows.
3. Run the installer.
4. Follow the installation prompts.
5. Open PowerShell or Git Bash.

#### Install Node.js

1. Visit https://nodejs.org/.
2. Download the Node.js 24 LTS Windows installer.
3. Run the installer.
4. Ensure the option to add Node.js to PATH is enabled.
5. Open a new PowerShell window.

Verify:

```powershell
node --version
npm --version
git --version
```

#### Clone the Project

```powershell
git clone https://github.com/shaunmicheal/Chiedza_Smart_Assistant.git
cd Chiedza_Smart_Assistant
```

---

## Database Configuration

Chiedza requires a PostgreSQL database.

You can use either a hosted Neon database or a local PostgreSQL installation.

### Option A: Neon PostgreSQL

Neon is recommended for a quick setup without installing PostgreSQL locally.

1. Visit https://neon.tech/.
2. Create an account and PostgreSQL project.
3. Open the project's connection details.
4. Copy the connection strings provided by Neon.

You need two connection values:

- `DATABASE_URL`: The application database connection.
- `DIRECT_URL`: The direct connection used by Prisma migrations.

Use the appropriate connection strings provided by your database provider. Keep credentials private and never commit them to Git.

### Option B: Local PostgreSQL

1. Visit https://www.postgresql.org/download/.
2. Install PostgreSQL for your operating system.
3. Start the PostgreSQL service.
4. Create a database for Chiedza.
5. Create or identify a database user with the required permissions.
6. Prepare a connection string.

Example:

```text
postgresql://USERNAME:PASSWORD@localhost:5432/chiedza_db
```

For a local database, you can normally use the same connection string for `DATABASE_URL` and `DIRECT_URL`.

---

## Local Setup

The backend and frontend must be installed separately.

### 1. Configure the Backend

From the project root:

```bash
cd backend
```

Create your local environment file.

Linux/macOS:

```bash
cp .env.example .env
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Open `backend/.env` and configure the required values:

```env
DATABASE_URL="your-postgresql-connection-string"
DIRECT_URL="your-direct-postgresql-connection-string"

NODE_ENV=development
PORT=5000
CLIENT_URL=http://localhost:5173

JWT_SECRET="replace-with-a-long-random-secret"
JWT_EXPIRES_IN=1h

BOOTSTRAP_SECRET="replace-with-a-long-random-secret"

OPENAI_API_KEY=
```

These are placeholders. Replace them with your actual configuration.

Install backend dependencies:

```bash
npm install
```

### 2. Generate Prisma Client

From the `backend` directory:

```bash
npx prisma generate
```

### 3. Apply Database Migrations

For a new local environment:

```bash
npx prisma migrate deploy
```

This applies existing migrations; it does not create a new migration.

**Important:** Confirm which database your environment variables point to before running migrations. Never experiment with migration or reset commands against a database containing records that must be preserved.

### 4. Configure the Frontend

Open a second terminal and return to the project root.

```bash
cd frontend
```

Create the local environment file.

Linux/macOS:

```bash
cp .env.example .env.local
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

Configure `frontend/.env.local`:

```env
VITE_API_URL=http://localhost:5000/api
```

This is a public frontend configuration value, not a secret. Never place database passwords, JWT secrets or private API keys in `VITE_*` variables.

Install frontend dependencies:

```bash
npm install
```

---

## Initial School Setup

A new database needs an initial school administrator account before normal sign-in.

Chiedza provides a protected bootstrap endpoint:

```text
POST /api/bootstrap
```

The endpoint uses the `BOOTSTRAP_SECRET` configured in the backend environment file.

It refuses to run if any School Administrator membership already exists in the connected database. It also rejects an existing school slug or administrator email address.

Start the backend first, then submit the bootstrap request.

### Linux / macOS

Generate a strong secret:

```bash
openssl rand -hex 32
```

Set the generated value as `BOOTSTRAP_SECRET` in `backend/.env`, then restart the backend.

Submit the request, replacing the example values:

```bash
curl -X POST http://localhost:5000/api/bootstrap \
  -H "Content-Type: application/json" \
  -H "x-bootstrap-secret: YOUR_BOOTSTRAP_SECRET" \
  -d '{
    "schoolName": "Example School",
    "schoolSlug": "example-school",
    "adminFirstName": "School",
    "adminLastName": "Administrator",
    "adminEmail": "admin@example.com",
    "adminPassword": "ReplaceWithAStrongPassword123!"
  }'
```

### Windows PowerShell

Set the bootstrap secret in `backend/.env` and restart the backend.

Then run:

```powershell
$headers = @{
    "x-bootstrap-secret" = "YOUR_BOOTSTRAP_SECRET"
}

$body = @{
    schoolName = "Example School"
    schoolSlug = "example-school"
    adminFirstName = "School"
    adminLastName = "Administrator"
    adminEmail = "admin@example.com"
    adminPassword = "ReplaceWithAStrongPassword123!"
} | ConvertTo-Json

Invoke-RestMethod `
    -Method Post `
    -Uri "http://localhost:5000/api/bootstrap" `
    -Headers $headers `
    -ContentType "application/json" `
    -Body $body
```

Replace all example values before submitting. Use a strong, unique administrator password.

After successful setup, sign in through the frontend using the administrator account.

Do not publish or share your bootstrap secret. Do not run the bootstrap operation against an existing school database.

---

## Environment Variables

### Backend: `backend/.env`

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection used by the application. |
| `DIRECT_URL` | Direct PostgreSQL connection used by Prisma migrations. |
| `NODE_ENV` | Application environment. |
| `PORT` | Backend server port. Defaults to `5000`. |
| `CLIENT_URL` | Frontend origin allowed by CORS. |
| `JWT_SECRET` | Secret used to sign authentication tokens. |
| `JWT_EXPIRES_IN` | Authentication token lifetime. |
| `BOOTSTRAP_SECRET` | Protects initial administrator setup. |
| `OPENAI_API_KEY` | Enables server-side AI-assisted communication drafts. |
WhatsApp Business variables shown in `backend/.env.example` are placeholders
for a future integration. They are not currently consumed by the backend.

### Frontend: `frontend/.env.local`

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Public base URL for the backend API, including `/api`. |

Environment files containing real secrets must remain local and must never be committed.

The repository includes `.env.example` files to show the required configuration without exposing credentials.

---

## Running the Application

Run the backend and frontend in separate terminals.

### Terminal 1: Backend

```bash
cd backend
npm run dev
```

The backend normally runs at:

http://localhost:5000

Check the health endpoint:

http://localhost:5000/api/health

### Terminal 2: Frontend

```bash
cd frontend
npm run dev
```

Vite normally serves the frontend at:

http://localhost:5173

Open that address in your browser.

If Vite selects a different port because the default is already in use, use the address shown in the terminal.

---

## Testing and Building

### Backend Tests

From the backend directory:

```bash
cd backend
npm test
```

The backend test suite uses a database configuration. Configure a dedicated test database before running tests.

**Never point test cleanup or test execution at a production database or a database containing records that must be preserved.**

### Frontend Linting

From the frontend directory:

```bash
cd frontend
npm run lint
```

### Frontend Production Build

```bash
cd frontend
npm run build
```

The production output is generated in `frontend/dist`.

To preview a production build locally:

```bash
npm run preview
```

---

## Database Management

Run Prisma commands from the `backend` directory.

Generate Prisma Client:

```bash
npx prisma generate
```

Apply existing migrations:

```bash
npx prisma migrate deploy
```

Check migration status:

```bash
npx prisma migrate status
```

Create a new migration during development after changing the Prisma schema:

```bash
npx prisma migrate dev --name describe_your_change
```

Open Prisma Studio:

```bash
npx prisma studio
```

Migration commands should only be run after checking the configured database and considering backups. Do not use destructive reset commands on databases containing records that must be retained.

---

## Deployment

The current deployment uses Vercel for the frontend, Render for the backend and Neon for PostgreSQL.

### Frontend: Vercel

Configure the Vercel project:

| Setting | Value |
|---|---|
| Root directory | `frontend` |
| Build command | `npm run build` |
| Output directory | `dist` |
| Environment variable | `VITE_API_URL` |

Set the production environment variable:

```env
VITE_API_URL=https://chiedza-smart-assistant.onrender.com/api
```

Redeploy after changing production environment variables.

### Backend: Render

Configure the Render web service:

| Setting | Value |
|---|---|
| Root directory | `backend` |
| Build command | `npm install && npx prisma generate` |
| Start command | `npm start` |

Configure the backend environment variables in Render.

At minimum, configure:

```env
NODE_ENV=production
CLIENT_URL=https://chiedza-smart-assistant.vercel.app
```

Also configure the production database URLs, JWT secret and bootstrap secret. Add the OpenAI API key if AI-assisted drafts are required.

Do not put backend secrets in Vercel frontend variables.

Apply database migrations as a deliberate deployment step after verifying the target database and backup arrangements. Do not casually run development migration commands against production.

### Database: Neon

Configure the production `DATABASE_URL` and `DIRECT_URL` using the connection details from the correct Neon project.

Keep database credentials private and restrict access to the production database.

### Deployment Health Checks

Frontend:

https://chiedza-smart-assistant.vercel.app/

Backend health:

https://chiedza-smart-assistant.onrender.com/api/health

A successful health response indicates that the API is responding and reports its database connection status. It does not, by itself, verify every application workflow.

---

## Security and Data Protection

Chiedza handles learner and family information. Protecting that information is essential.

Important practices:

- Keep database credentials, JWT secrets, bootstrap secrets and API keys out of source control.
- Use strong, unique secrets in production.
- Use HTTPS for deployed services.
- Enforce access controls on the backend.
- Restrict teachers to their assigned classes.
- Restrict parent access to verified learner relationships.
- Avoid using real learner information in development or demonstrations without appropriate authorisation.
- Use fictional records in tests.
- Review AI-generated parent communication before approval.
- Preserve learner history when deactivating a learner.
- Back up important databases and verify recovery procedures.

AI-generated content must not independently determine a learner's educational outcome or replace professional judgement.

---

## Current Implementation Status

The project currently includes:

- School administration and role-based access.
- Learner, class, teacher and parent management.
- Attendance recording and assessment results.
- Early-warning evaluation for supported absence and academic-decline patterns.
- English and Shona parent communication drafts with staff review and approval.
- Parent portal access to linked active learners and approved messages.
- Administrator-created parent accounts.
- Secure invitation-code parent activation.
- Learner deactivation and reactivation with historical record retention.

The following capabilities are not currently implemented as complete delivery workflows:

- Automatic parent invitation email delivery.
- Automatic outbound delivery of approved parent messages.
- WhatsApp message delivery.
- A fully implemented parent notification delivery service.
- Real-time application updates.

The project remains a startup concept with a proposed local pilot. This documentation does not claim that a pilot has been approved or completed.

---

## Troubleshooting

### `node` or `npm` is Not Recognised

- Confirm Node.js is installed.
- Close and reopen your terminal.
- Check that Node.js was added to your system PATH.

Run:

```bash
node --version
npm --version
```

### Database Connection Fails

- Confirm PostgreSQL or Neon is available.
- Check `DATABASE_URL` and `DIRECT_URL`.
- Confirm the username, password, host, port and database name.
- Check that the database accepts connections from your current network.

### Prisma Reports a Missing `DIRECT_URL`

Check that `backend/.env` exists and contains a valid `DIRECT_URL`.

Prisma's configuration uses this value for migration operations.

### Frontend Cannot Connect to the Backend

- Confirm the backend is running.
- Check `VITE_API_URL` in `frontend/.env.local`.
- Confirm the URL ends with `/api`.
- Restart the Vite development server after changing environment variables.

### Browser Reports a CORS Error

Check that the backend's `CLIENT_URL` matches the frontend origin exactly, including the protocol.

For local development:

```env
CLIENT_URL=http://localhost:5173
```

For production, use the deployed frontend origin.

### Login Fails After Initial Setup

- Confirm the initial administrator bootstrap completed successfully.
- Check that the frontend points to the correct backend.
- Check that the backend can connect to the intended database.
- Review the backend logs without exposing passwords or tokens.

### Migration Fails

- Check database connectivity and credentials.
- Confirm `DIRECT_URL` is configured.
- Review the error before attempting another migration.
- Do not reset a database containing records that must be preserved.

### Port 5000 or 5173 Is Already in Use

Another process may be using the port. Stop the conflicting process or use an available port where supported.

---

## API Documentation

The backend API contract is maintained in:

`backend/API_CONTRACT.md`

It documents endpoints, request and response formats, authentication requirements and role-based access restrictions.

Local health endpoint:

http://localhost:5000/api/health

Production health endpoint:

https://chiedza-smart-assistant.onrender.com/api/health

## Contributing

Contributions and improvements are welcome.

1. Fork or clone the repository.
2. Create a feature branch.
3. Follow the existing project structure.
4. Keep secrets and environment files out of Git.
5. Add or update tests for relevant backend changes.
6. Run backend tests.
7. Run frontend linting and the production build.
8. Document new endpoints and configuration changes.
9. Submit changes for review.

Suggested branch names:

```text
feature/feature-name
fix/issue-description
docs/documentation-update
```

Suggested commit prefixes:

```text
feat: add new functionality
fix: resolve an application issue
docs: update project documentation
test: add or update tests
refactor: improve internal implementation
```

## License

No open-source licence has been specified for this repository.

Unless a licence is added, the source code remains the property of its owner. Permission to use, modify or redistribute the project should not be assumed.

## Project Links

| Resource | Link |
|---|---|
| Live Application | https://chiedza-smart-assistant.vercel.app/ |
| Backend API | https://chiedza-smart-assistant.onrender.com |
| API Health | https://chiedza-smart-assistant.onrender.com/api/health |
| GitHub Repository | https://github.com/shaunmicheal/Chiedza_Smart_Assistant |
| API Contract | `backend/API_CONTRACT.md` |

---

**Chiedza Smart Assistant — Supporting better school administration, learner progress monitoring and parent communication.**
