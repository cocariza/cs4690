# CS 4690 Mega Practicum

Multi-tenant (UVU + UofU) role-based student logs app. Built on the Project 4 Express + Mongoose scaffold and extended with session auth, four user roles, automated tests, and per-tenant theming.

## Stack

- Express 4 + TypeScript (CommonJS on the server, ES modules on the client)
- MongoDB via Mongoose, accessed through a generic `Repository<T>` class
- `bcryptjs` for password hashing, `express-session` for session cookies
- jQuery-less vanilla DOM + Bootstrap 5.3 on the client
- Jest + supertest + `mongodb-memory-server` for automated tests

## Project structure

```
mega-practicum/
  app.ts                  Express wiring + per-tenant static serving + page guards
  bin/www.ts              Server entrypoint
  server/
    db/Repository.ts      Generic CRUD against Mongoose models
    middleware/           tenant + auth guards (requireRole logs/logouts/redirects)
    models/               User, Course, Log, Entity
    routes/               auth, users, courses, logs
    seed.ts               Seeds root_uvu/willy, root_uofu/swoopy, sample courses
    types.ts              Tenant + Role unions
  src/                    Client TS (compiled to public/js)
    common.ts, login.ts, signup.ts, admin.ts, teacher.ts, ta.ts, student.ts
  public/                 HTML + CSS (tenant-themed)
  __tests__/              auth.test.ts, roles.test.ts, tenant.test.ts
```

## Setup

1. Install Node 20+ and MongoDB Atlas access (or local mongod).
2. Copy env template:
   ```
   cp .env.example .env
   ```
   Edit `.env`:
   - `MONGO_URI` - Atlas connection string
   - `SESSION_SECRET` - any long random string
   - `PORT` - default 3000
3. Install dependencies:
   ```
   npm install
   ```
4. Build and seed:
   ```
   npm run build
   npm run seed
   ```
5. Start the server:
   ```
   npm start
   ```
6. Open:
   - http://localhost:3000/uvu/ (UVU green theme)
   - http://localhost:3000/uofu/ (UofU red theme)

## Seeded accounts

| Tenant | Username     | Password | Role  |
|--------|--------------|----------|-------|
| UVU    | `root_uvu`   | `willy`  | admin |
| UofU   | `root_uofu`  | `swoopy` | admin |

The seed script also creates sample courses: `cs1400`, `cs4690` (UVU) and `cs3005`, `cs4400` (UofU).

Students can self-signup via the Sign Up link on any login page; that role is gated server-side to `student`.

## Running tests

```
npm test
```

The suite uses `mongodb-memory-server`, which downloads a MongoDB binary on first run (cached afterward). Covered:

- **auth.test.ts** - login/logout, session behavior, student self-signup, teacher self-signup rejection
- **roles.test.ts** - admin creates teacher, teacher cannot create admin (and gets logged out), student cannot list users, teacher creates/sees own course, student self-enrolls, student sees only own logs, student cannot post log under another uvuId
- **tenant.test.ts** - UVU admin blocked from UofU endpoints (session destroyed), same username allowed in different tenants, cross-tenant course isolation, invalid tenant 400, non-admin hitting `/uvu/admin.html` gets redirected and session destroyed, admin can load admin page

## Role permissions

| Action                     | admin | teacher | TA | student |
|----------------------------|:-----:|:-------:|:--:|:-------:|
| See all courses            | yes   | no      | no | no      |
| See own/assigned courses   | -     | yes     | yes| yes     |
| Create course              | yes   | yes     | no | no      |
| Create admin               | yes   | no      | no | no      |
| Create teacher             | yes   | no      | no | no      |
| Create TA                  | yes   | yes     | no | no      |
| Create student             | yes   | yes     | yes| no      |
| Add student to course      | yes   | yes     | yes| self    |
| See all logs               | yes   | no      | no | no      |
| See logs for own courses   | -     | yes     | yes| -       |
| See own logs only          | -     | -       | -  | yes     |

Any unauthorized action triggers: server logs the violation to console → `req.session.destroy()` → redirect to the tenant login page.

## Multi-tenant model

- Path-prefix tenancy: `/uvu/*` for UVU, `/uofu/*` for UofU.
- Every document (`User`, `Course`, `Log`) has a `tenant: 'uvu' | 'uofu'` field; all queries filter on it.
- Unique indexes are compound on `(username, tenant)` and `(courseId, tenant)` so the two tenants share the same DB without collisions.
- Sessions store `tenant` and are validated on every protected route. Cross-tenant attempts destroy the session.
- UI reads the tenant from `location.pathname` and applies CSS variables (UVU green `#275d38` vs UofU red `#cc0000`).

## Final presentation demo script (matches the rubric)

Log in: http://localhost:3000/uvu/login.html as `root_uvu` / `willy`.

**(a) Code snippets.** Walk through `server/middleware/auth.ts` (`requireRole` + `destroyAndRedirect`), `server/routes/users.ts` (`canCreate` role table), and `app.ts` (`pageGuard` on `/uvu/admin.html`).

**(b.i) Manual redirect to UofU.** While logged in as UVU admin, paste `http://localhost:3000/uofu/admin.html` into the URL bar. Observe: redirected to UofU login, previous session destroyed, console shows `[SECURITY] Cross-tenant page access blocked ...`.

**(b.ii) UVU admin → UVU create teacher page.** Paste `http://localhost:3000/uvu/admin.html`. You are still logged in, the create-user form is there, create a teacher and watch the list refresh.

**(b.iii) UVU non-admin → UVU admin page.** Log out, log in as a student (sign up one at `/uvu/signup.html`). Paste `http://localhost:3000/uvu/admin.html`. Observe: redirected to `/uvu/login.html`, session destroyed, console shows `[SECURITY] Role 'student' not permitted for /uvu/admin.html`.

**(b.iv) Admin vs non-admin API resources.** Still as the student, open devtools and `fetch('/api/v1/uvu/users')`. Response: 401 + redirect, session destroyed. Same for `fetch('/api/v1/uvu/logs?uvuId=someoneElse')` once you add a student - backend returns 401 with "Student attempted to view another student log".

**(c) Unit tests.**
```
npm test
```
Point to `__tests__/tenant.test.ts` "page redirect for non-admin hitting admin page logs and destroys session" for the rubric-critical one.

## Deliverable packaging

```
zip -r mega-practicum.zip . -x 'node_modules/*' -x 'dist/*' -x '.env' -x 'public/js/*.js' -x 'public/js/*.js.map'
```

## Notes

- Sessions are stored in memory; restarting the server logs everyone out. Fine for the demo.
- bcryptjs (not native bcrypt) is used so `npm install` stays fast and cross-platform.
- Client TS compiles to `public/js/` as ES modules; each HTML page imports its corresponding compiled `.js` file.
