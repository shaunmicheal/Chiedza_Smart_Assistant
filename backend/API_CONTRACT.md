# Chiedza Smart Assistant — Backend API Contract

> **Documentation only.** This file describes the actual implemented backend API. Do not invent endpoints or claim functionality not present in the code.

## Table of Contents

1. [Authentication & Session Handling](#authentication--session-handling)
2. [School Endpoints](#school-endpoints)
3. [Teacher Management](#teacher-management)
4. [Class Management](#class-management)
5. [Learner Management](#learner-management)
6. [Attendance](#attendance)
7. [Assessments](#assessments)
8. [Early-Warning Rules & Alerts](#early-warning-rules--alerts)
9. [Parent Communication Drafts](#parent-communication-drafts)
10. [Error Response Format](#error-response-format)
11. [Role Permissions](#role-permissions)
12. [Environment Variables](#environment-variables)
13. [Integration Limitations](#backend-integration-limitations)

---

## Authentication & Session Handling

All routes are prefixed with `/api`. Authentication uses JWT tokens (Bearer header or cookie `chiedza_token`).

### POST /api/auth/login

**Request body:**
```json
{ "email": "user@example.com", "password": "password123" }
```

**Response (200):**
```json
{ "success": true, "data": { "token": "jwt-token-here" } }
```

**Errors:** `401` — Invalid credentials.

### GET /api/auth/me

**Authentication:** Required.

**Response (200):**
```json
{ "success": true, "data": { "id": "...", "firstName": "...", "lastName": "...", "email": "...", "phone": "...", "isActive": true, "memberships": [...] } }
```

### POST /api/auth/logout

**Authentication:** Required.

**Response (200):**
```json
{ "success": true, "message": "Logged out" }
```

### POST /api/auth/bootstrap

**Authentication:** Requires `BOOTSTRAP_SECRET`.

**Response (200):** Creates initial school and admin user.

---

## School Endpoints

### GET /api/schools

**Authentication:** Required.

**Response (200):**
```json
{ "success": true, "data": [{ "id": "...", "name": "...", "slug": "...", "email": "...", "phone": "...", "address": "...", "isActive": true }] }
```

### GET /api/schools/:schoolId

**Authentication:** `requireSchoolMembership`.

**Response (200):**
```json
{ "success": true, "data": { "id": "...", "name": "...", "slug": "...", ... } }
```

### POST /api/schools

**Authentication:** Required.

**Request body:**
```json
{ "name": "School Name", "slug": "school-slug", "email": "school@example.com", "phone": "...", "address": "..." }
```

**Response (201):** Created school.

---

## Teacher Management

### GET /api/schools/:schoolId/teachers

**Authentication:** `requireSchoolMembership` + `requireRole("SCHOOL_ADMIN")`.

**Response (200):**
```json
{ "success": true, "data": [{ "id": "...", "firstName": "...", "lastName": "...", "email": "..." }] }
```

### POST /api/schools/:schoolId/teachers

**Authentication:** `requireSchoolMembership` + `requireRole("SCHOOL_ADMIN")`.

**Request body:**
```json
{ "firstName": "Teacher", "lastName": "Name", "email": "teacher@example.com", "password": "password123" }
```

**Response (201):** Created teacher.

---

## Class Management

### GET /api/schools/:schoolId/classes

**Authentication:** `requireSchoolMembership`.

**Response (200):**
```json
{ "success": true, "data": [{ "id": "...", "name": "...", "academicYear": "2026", "description": "...", "schoolId": "..." }] }
```

### POST /api/schools/:schoolId/classes

**Authentication:** `requireSchoolMembership` + `requireRole("SCHOOL_ADMIN")`.

**Request body:**
```json
{ "name": "Grade 1", "academicYear": "2026", "description": "..." }
```

**Response (201):** Created class.

### POST /api/schools/:schoolId/classes/:classId/teachers

**Authentication:** `requireSchoolMembership` + `requireRole("SCHOOL_ADMIN")`.

**Request body:**
```json
{ "membershipId": "..." }
```

**Response (201):** Teacher assigned to class.

---

## Learner Management

### GET /api/schools/:schoolId/learners

**Authentication:** `requireSchoolMembership`.

**Response (200):**
```json
{ "success": true, "data": [{ "id": "...", "firstName": "...", "lastName": "...", "classId": "...", "admissionNumber": "...", "dateOfBirth": "...", "isActive": true }] }
```

### GET /api/schools/:schoolId/learners/:learnerId

**Authentication:** `requireSchoolMembership`.

**Response (200):**
```json
{ "success": true, "data": { "id": "...", "firstName": "...", "lastName": "...", "classId": "...", ... } }
```

### POST /api/schools/:schoolId/learners

**Authentication:** `requireSchoolMembership` + `requireRole("SCHOOL_ADMIN")`.

**Request body:**
```json
{ "classId": "...", "firstName": "Alice", "lastName": "Moyo", "admissionNumber": "A-001", "dateOfBirth": "2010-01-01" }
```

**Response (201):** Created learner.

### PATCH /api/schools/:schoolId/learners/:learnerId

**Authentication:** `requireSchoolMembership` + `requireRole("SCHOOL_ADMIN")`.

**Request body:**
```json
{ "firstName": "...", "lastName": "...", "classId": "...", "isActive": true }
```

**Response (200):** Updated learner.

---

## Attendance

### POST /api/schools/:schoolId/attendance

**Authentication:** `requireSchoolMembership` + `requireClassAccess`.

**Request body:**
```json
{ "learnerId": "...", "date": "2026-01-15", "status": "PRESENT" }
```

**Response (201):**
```json
{ "success": true, "data": { "id": "...", "schoolId": "...", "learnerId": "...", "date": "...", "status": "PRESENT", "recordedById": "..." } }
```

### GET /api/schools/:schoolId/attendance

**Authentication:** `requireSchoolMembership` + `requireClassAccess`.

**Query params:** `date` (optional, YYYY-MM-DD), `classId` (optional), `learnerId` (optional).

**Response (200):**
```json
{ "success": true, "data": [{ "id": "...", "schoolId": "...", "learnerId": "...", "date": "...", "status": "..." }] }
```

### GET /api/schools/:schoolId/learners/:learnerId/attendance

**Authentication:** `requireSchoolMembership` + `requireClassAccess`.

**Response (200):**
```json
{ "success": true, "data": [{ "id": "...", "schoolId": "...", "learnerId": "...", "date": "...", "status": "..." }] }
```

### GET /api/schools/:schoolId/attendance/:attendanceId

**Authentication:** `requireSchoolMembership` + `requireClassAccess`.

**Response (200):**
```json
{ "success": true, "data": { "id": "...", "schoolId": "...", "learnerId": "...", "date": "...", "status": "..." } }
```

### PATCH /api/schools/:schoolId/attendance/:attendanceId

**Authentication:** `requireSchoolMembership` + `requireClassAccess`.

**Request body:**
```json
{ "status": "LATE", "date": "2026-01-15" }
```

**Response (200):** Updated attendance record.

---

## Assessments

### POST /api/schools/:schoolId/assessments

**Authentication:** `requireSchoolMembership` + `requireClassAccess`.

**Request body:**
```json
{ "classId": "...", "title": "Mathematics Midterm", "description": "...", "date": "2026-01-15", "maxScore": 100 }
```

**Response (201):** Created assessment.

### GET /api/schools/:schoolId/assessments

**Authentication:** `requireSchoolMembership` + `requireClassAccess`.

**Query params:** `classId` (optional).

**Response (200):**
```json
{ "success": true, "data": [{ "id": "...", "schoolId": "...", "classId": "...", "title": "...", "date": "...", "maxScore": 100 }] }
```

### GET /api/schools/:schoolId/assessments/:assessmentId

**Authentication:** `requireSchoolMembership` + `requireClassAccess`.

**Response (200):**
```json
{ "success": true, "data": { "id": "...", "schoolId": "...", "classId": "...", "title": "...", "date": "...", "maxScore": 100 } }
```

### PATCH /api/schools/:schoolId/assessments/:assessmentId

**Authentication:** `requireSchoolMembership` + `requireClassAccess`.

**Request body:**
```json
{ "title": "Updated Title", "maxScore": 150 }
```

**Response (200):** Updated assessment.

### POST /api/schools/:schoolId/assessments/:assessmentId/results

**Authentication:** `requireSchoolMembership` + `requireClassAccess`.

**Request body:**
```json
{ "learnerId": "...", "score": 85 }
```

**Response (201):** Created assessment result.

### GET /api/schools/:schoolId/assessments/:assessmentId/results

**Authentication:** `requireSchoolMembership` + `requireClassAccess`.

**Response (200):**
```json
{ "success": true, "data": [{ "id": "...", "learnerId": "...", "score": 85, ... }] }
```

### GET /api/schools/:schoolId/learners/:learnerId/assessments

**Authentication:** `requireSchoolMembership` + `requireClassAccess`.

**Response (200):**
```json
{ "success": true, "data": [{ "id": "...", "assessmentId": "...", "score": 85, ... }] }
```

### PATCH /api/schools/:schoolId/assessments/:assessmentId/results/:resultId

**Authentication:** `requireSchoolMembership` + `requireClassAccess`.

**Request body:**
```json
{ "score": 90 }
```

**Response (200):** Updated result.

---

## Early-Warning Rules & Alerts

### GET /api/schools/:schoolId/early-warning-alerts

**Authentication:** `requireSchoolMembership`.

**Response (200):**
```json
{ "success": true, "data": [{ "id": "...", "alertType": "...", "status": "ACTIVE", "evidence": {...}, ... }] }
```

### GET /api/schools/:schoolId/early-warning-alerts/:alertId

**Authentication:** `requireSchoolMembership`.

**Response (200):**
```json
{ "success": true, "data": { "id": "...", "alertType": "...", "status": "ACTIVE", ... } }
```

### POST /api/schools/:schoolId/early-warning-alerts/:alertId/acknowledge

**Authentication:** `requireSchoolMembership`.

**Response (200):** Acknowledged alert.

### POST /api/schools/:schoolId/early-warning-alerts/:alertId/resolve

**Authentication:** `requireSchoolMembership`.

**Response (200):** Resolved alert.

---

## Parent Communication Drafts

### GET /api/schools/:schoolId/drafts

**Authentication:** `requireSchoolMembership` + `requireRole("SCHOOL_ADMIN", "TEACHER")`.

**Response (200):**
```json
{ "success": true, "count": N, "data": [{ "id": "...", "schoolId": "...", "alertId": "...", "userId": "...", "language": "en", "draftText": "...", "status": "DRAFT" }] }
```

### POST /api/schools/:schoolId/drafts/generate

**Authentication:** `requireSchoolMembership`.

**Request body:**
```json
{ "alertId": "actual-alert-id", "language": "en" }
```

**Response (201):**
```json
{ "success": true, "data": { "id": "...", "schoolId": "...", "alertId": "...", "userId": "...", "language": "en", "draftText": "...", "status": "DRAFT" } }
```

### PATCH /api/schools/:schoolId/drafts/:draftId

**Authentication:** `requireSchoolMembership`.

**Request body:**
```json
{ "draftText": "Updated message text" }
```

**Response (200):** Updated draft.

### PATCH /api/schools/:schoolId/drafts/:draftId/approve

**Authentication:** `requireSchoolMembership`.

**Response (200):**
```json
{ "success": true, "data": { "id": "...", "status": "APPROVED", "approvedBy": "...", "approvedAt": "..." } }
```

---

## Error Response Format

All errors follow this format:

```json
{ "success": false, "message": "Human-readable error message." }
```

### Common Status Codes

| Status | Meaning |
|--------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad request (validation error) |
| 401 | Authentication required |
| 403 | Forbidden (permission denied) |
| 404 | Resource not found |
| 409 | Conflict (duplicate, already approved, etc.) |
| 500 | Server error (configuration error, etc.) |

---

## Role Permissions

| Role | Permissions |
|------|-------------|
| **SCHOOL_ADMIN** | Full access to all school data, can create/edit/delete classes, learners, assessments, attendance; can manage teachers; can approve drafts |
| **TEACHER** | Can access assigned classes only; can record attendance and assessments for assigned classes; can create/edit drafts for assigned classes; can approve their own drafts |
| **PARENT** | No access to school management features; only access to parent-specific endpoints (not documented here) |

### Data Access Restrictions

- **School isolation**: All queries are scoped to `schoolId`
- **Teacher class assignment**: Teachers can only access classes they're assigned to via `ClassTeacher`
- **Draft ownership**: Teachers can only edit/approve drafts they created (or SCHOOL_ADMIN can edit any in their school)
- **Cross-school access**: Always denied (403)

---

## Environment Variables

### Required

- `DATABASE_URL` — PostgreSQL connection string
- `JWT_SECRET` — JWT signing secret
- `BOOTSTRAP_SECRET` — Bootstrap authentication secret
- `OPENAI_API_KEY` — OpenAI API key for draft generation (required for draft generation)

### Optional

- `JWT_EXPIRES_IN` — JWT token expiry (default: 1h)
- `CLIENT_URL` — Frontend URL for CORS (default: http://localhost:5173)
- `NODE_ENV` — Environment (default: development)
- `PORT` — Server port (default: 3000)

---

## Backend Integration Limitations

1. **No real-time updates**: Changes require page refresh
2. **No WebSocket/SSE**: No automatic notifications
3. **Draft approval does not deliver**: Approving a draft only changes status; does not send message
4. **OpenAI dependency**: Draft generation requires `OPENAI_API_KEY` and network access
5. **No caching**: OpenAI API called on each generation request
6. **No batch operations**: All operations are individual
7. **No offline support**: All operations require backend connection
8. **No optimistic locking**: Concurrent edits may conflict; last write wins
9. **Database dependency**: All operations require functioning Prisma connection
10. **Rate limiting**: Not implemented at API level
11. **No WebSocket/SSE**: No automatic notifications when records are created or updated
12. **Assessment early warning**: Early warning evaluation runs after each attendance/assessment recording

---

## Files Inspected

- `src/routes/auth.routes.js`
- `src/routes/schools.routes.js`
- `src/routes/attendance.routes.js`
- `src/routes/assessment.routes.js`
- `src/routes/draft.routes.js`
- `src/routes/earlyWarning.routes.js`
- `src/controllers/attendance.controller.js`
- `src/controllers/assessment.controller.js`
- `src/controllers/draft.controller.js`
- `src/controllers/earlyWarning.controller.js`
- `src/middleware/authenticate.js`
- `src/middleware/authorize.js`
- `src/middleware/requireClassAccess.js`
- `src/middleware/validate.js`
- `src/validators/draft.validators.js`
- `src/services/attendance.service.js`
- `src/services/assessment.service.js`
- `src/services/assessmentQuery.service.js`
- `prisma/schema.prisma`
- `src/tests/attendance.test.js`
- `src/tests/assessment.test.js`
- `src/tests/draft.test.js`
- `src/tests/earlyWarning.test.js`

---

*Generated from actual backend implementation. All endpoints documented here are implemented and verified against the source code.*
