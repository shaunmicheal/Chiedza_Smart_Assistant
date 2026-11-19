# Chiedza Smart Assistant

Chiedza Smart Assistant is a school-management and learning-support platform designed for private Early Childhood Development (ECD) and primary schools.

It brings school records and parent communication into one role-based application. Its early-warning workflow helps staff identify patterns such as repeated absences or declining assessment performance. Staff can review alerts and prepare parent communication drafts in English or Shona. A draft must be reviewed and approved by an authorised staff member before it is shared with a parent.

## Project status

The project is being developed as a startup concept with a proposed local school pilot. The current application includes administrator, teacher and parent workspaces.

The parent portal displays linked learners, attendance, assessment results and approved school messages. Parent onboarding supports administrator-created accounts with temporary credentials and one-time invitation codes that parents can use to activate their own accounts. Invitation codes must be shared manually by an administrator; automatic email delivery is not implemented. A separate automated notification service and WhatsApp integration are also not currently implemented.

## Main capabilities

- Role-based authentication for school administrators, teachers and parents.
- School, class, teacher and learner management.
- Teacher class assignments and class-scoped learner access.
- Attendance recording and review.
- Assessment creation and learner assessment results.
- Early-warning rules and alerts for repeated absences and academic decline.
- English and Shona parent communication drafts, with staff approval.
- Parent portal restricted to verified links with active learners.
- Parent onboarding through administrator-created accounts or one-time invitation-code activation.
- Parent access to approved messages only.

## Technology

| Area | Technology |
|---|---|
| Frontend | React, Vite, React Router |
| Styling and UI | CSS, Lucide React |
| Data visualisation | Recharts |
| Backend | Node.js, Express |
| Database | PostgreSQL |
| ORM and migrations | Prisma |
| Authentication | JWT |
| Validation and tests | Express validators, Vitest |
| AI-assisted drafts | OpenAI API (server-side) |
| Frontend hosting | Vercel |
| Backend hosting | Render |
| Database hosting | Neon |

## Repository structure

```text
Chiedza_Smart_Assistant/
├── backend/
│   ├── prisma/                 # Prisma schema and migrations
│   ├── src/
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
│   ├── src/
│   │   ├── components/
│   │   ├── context/
│   │   ├── pages/
│   │   ├── routes/
│   │   └── lib/
│   ├── .env.example
│   └── package.json
└── README.md
```

## Requirements

- Node.js and npm.
- A PostgreSQL database.
- A database connection string suitable for Prisma.
- A JWT signing secret.
- An OpenAI API key if AI-assisted draft generation is to be used.

## Local setup

### 1. Clone the repository

```bash
git clone https://github.com/shaunmicheal/Chiedza_Smart_Assistant.git
cd Chiedza_Smart_Assistant
```

### 2. Configure the backend

```bash
cd backend
npm install
cp .env.example .env
```

Set the values in `backend/.env`. At minimum, configure the database connection, JWT secret and the direct database connection used for migrations where required by the Prisma configuration.

Generate Prisma Client and apply migrations:

```bash
npx prisma generate
npx prisma migrate deploy
```

For a local development database where migrations need to be created, use the Prisma development migration workflow rather than `migrate deploy`.

Start the API:

```bash
npm run dev
```

The local API uses port `5000` by default. The health endpoint is:

```text
http://localhost:5000/api/health
```

### 3. Configure the frontend

Open a second terminal:

```bash
cd Chiedza_Smart_Assistant/frontend
npm install
cp .env.example .env.local
```

For local development, the frontend API setting should point to:

```text
VITE_API_URL=http://localhost:5000/api
```

Start Vite:

```bash
npm run dev
```

The Vite development server normally runs at `http://localhost:5173`.

## Environment variables

### Backend

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL connection used by the application |
| `DIRECT_URL` | Direct PostgreSQL connection for Prisma operations where required |
| `JWT_SECRET` | Secret used to sign authentication tokens |
| `JWT_EXPIRES_IN` | Token lifetime; for example `1h` |
| `CLIENT_URL` | Allowed frontend origin for CORS |
| `NODE_ENV` | Runtime environment |
| `PORT` | API port; hosting platforms may provide this |
| `BOOTSTRAP_SECRET` | Secret protecting the initial administrator bootstrap workflow |
| `OPENAI_API_KEY` | Server-side key for AI-assisted parent draft generation |

Never commit `.env` files or expose backend secrets in frontend variables.

### Frontend

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | Base URL of the backend API, including `/api` |

Vite variables are included in the browser bundle. Do not put private keys or secrets in `VITE_*` variables.

## Roles and access boundaries

- **School administrator:** manages school-level records, staff, classes, learners and school settings.
- **Teacher:** works with assigned classes and the learners and teaching records permitted by class-level access controls.
- **Parent/guardian:** can view only records belonging to their verified, active learner links. Parent communication is limited to approved drafts.

The backend enforces access restrictions. Frontend route visibility is not a substitute for backend authorisation.

## Early-warning and parent communication workflow

1. Attendance and assessment records are maintained by authorised school staff.
2. Early-warning rules evaluate supported patterns, including repeated absences and academic decline.
3. Alerts are available to authorised staff for review.
4. Staff can generate a parent communication draft in English or Shona.
5. The draft remains a draft until an authorised staff member approves it.
6. The parent portal displays approved messages associated with the parent's verified learner links.

AI-generated content should be reviewed by staff. It should not be treated as an independent decision about a learner or family.

## API documentation

See [backend/API_CONTRACT.md](backend/API_CONTRACT.md) for endpoint details, request and response formats, role permissions and integration notes.

## Testing and production build

Run the backend test suite:

```bash
cd backend
npm test
```

Build the frontend:

```bash
cd frontend
npm run build
```

Run the frontend lint command:

```bash
npm run lint
```

## Deployment overview

### Backend (Render)

Configure the backend service with `backend` as its root directory. Install dependencies, generate Prisma Client and apply production migrations as part of the deployment process. Configure the backend environment variables in the hosting dashboard; do not upload `.env`.

Set `CLIENT_URL` to the deployed frontend origin.

### Frontend (Vercel)

Configure the frontend project with `frontend` as its root directory and use the Vite build output directory `dist`.

Set `VITE_API_URL` to the deployed backend API base URL, including `/api`, for example:

```text
https://your-backend-domain.example/api
```

The actual value must match the deployed backend service. Redeploy the frontend after changing build-time environment variables.

## Data protection principles

- Enforce authorisation on the backend for every protected resource.
- Restrict teacher access to assigned classes where applicable.
- Restrict parent records to verified links with active learners.
- Share approved parent communication only.
- Keep API keys, JWT secrets and database credentials on the server.
- Review AI-generated communication before approval.
- Avoid exposing internal staff notes or unrelated learner records to parents.

## Current limitations

- A separate parent notification service is not yet implemented.
- WhatsApp Business integration is postponed and is not required for the current parent portal.
- Email delivery is not represented as an implemented feature unless separately configured and verified.
- The project is being prepared for a proposed pilot; this README does not imply that a school partnership or deployment has been approved.

## License

No open-source licence has been specified yet. All rights are reserved by the project owner unless a licence is added to this repository.
