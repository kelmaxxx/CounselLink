# CounselLink

A student counseling management system for MSU (Mindanao State University). Capstone project — currently under active development.

## Features

- Multi-role authentication (Students, Counselors, College Representatives, Admins)
- Appointment management (request, schedule, accept/reject, urgent flagging)
- One-on-one messaging between students and counselors
- Notifications and announcement broadcasts
- Psychological test requests and results
- Admin user management (approve student registrations, manage staff)
- Reports and analytics
- Responsive UI (desktop, tablet, mobile)

## Architecture

- **Frontend** — React 19 + Vite (rolldown-vite) + Tailwind CSS, runs on port `5173`
- **Backend** — Node.js + Express (ESM), runs on port `5000`
- **Database** — MySQL 8 (database name: `counselink`)
- **Auth** — JWT bearer tokens, bcrypt password hashing
- **Email** — Nodemailer over SMTP (Gmail app password)

Frontend talks to backend at `http://localhost:5000/api/*`. The frontend can override this via `VITE_API_BASE` in `frontend/.env`.

The repo is split into two sibling folders:

```
counselLink/
├── frontend/   # React + Vite app  (npm run dev → http://localhost:5173)
└── backend/    # Express + MySQL API (npm run dev → http://localhost:5000)
```

Each folder has its own `package.json` and `node_modules`.

## Prerequisites

- Node.js v18+
- MySQL 8
- npm

## Setup

```powershell
# 1. Install dependencies (each folder has its own package.json)
cd frontend ; npm install ; cd ..
cd backend  ; npm install ; cd ..

# 2. Configure backend env
copy backend\.env.example backend\.env
# Edit backend\.env and fill in DB_PASSWORD, EMAIL_USER, EMAIL_PASS

# 3. Create the DB and seed staff accounts
mysql -u root -p < backend\schema.sql
mysql -u root -p < backend\seed.sql
```

## Pulling Latest Changes (for collaborators)

After every `git pull`, run this checklist. Skipping any step is the #1 cause of "it doesn't work on my machine" errors.

```powershell
# 1. Make sure you're on the right branch.
# Active sprint work lives on 'final-sprint-2026-05', not 'main'.
# (If the sprint PR has already been merged, switch back to 'main'.)
git fetch
git checkout final-sprint-2026-05
git pull

# 2. Reinstall dependencies — frontend AND backend each have their own package.json
cd frontend ; npm install ; cd ..
cd backend  ; npm install ; cd ..

# 3. Apply any new database migrations
# Check backend\migrations\ for files newer than your last pull and run each one.
mysql -u root -p counselink < backend\migrations\006_password_resets.sql
# Repeat for any other new migration files (001-005 if you don't have them yet)

# 4. Update your backend\.env if backend\.env.example added new keys
# Open both files side by side. Any key in .env.example that's missing from
# your .env -> add it (especially EMAIL_HOST/PORT/USER/PASS/FROM for password reset).

# 5. Start both servers
cd backend  ; npm run dev   # terminal 1 (backend on :5000)
cd frontend ; npm run dev   # terminal 2 (frontend on :5173)
```

If you still see "module not found" or "Unknown column" errors after these steps, paste the full error to the team chat before assuming the code is broken.

## Running

Open two terminals:

```powershell
# Terminal 1 — backend
cd backend
npm run dev          # starts on http://localhost:5000

# Terminal 2 — frontend
cd frontend
npm run dev          # starts on http://localhost:5173
```

Then open `http://localhost:5173` in your browser.

## Default Login Credentials

All seeded staff accounts are pre-approved.

| Role             | Email                       | Password       |
| ---------------- | --------------------------- | -------------- |
| Admin            | `admin@msu.edu.ph`          | `admin123`     |
| Counselor (CICS) | `counselor@msu.edu.ph`      | `counselor123` |
| Counselor (COE)  | `counselor2@msu.edu.ph`     | `counselor123` |
| Counselor (CBAA) | `counselor3@msu.edu.ph`     | `counselor123` |
| Counselor (CHS)  | `counselor4@msu.edu.ph`     | `counselor123` |
| College Rep      | `rep@msu.edu.ph`            | `rep123`       |
| College Rep      | `rep2@msu.edu.ph`           | `rep123`       |
| College Rep      | `rep3@msu.edu.ph`           | `rep123`       |

Students register through the signup form (with COR upload) and must be approved by the admin before they can log in.

## Backend Environment Variables (`backend/.env`)

| Variable           | Purpose                                                  |
| ------------------ | -------------------------------------------------------- |
| `PORT`             | Backend port (default `5000`)                            |
| `DB_HOST`          | MySQL host (default `localhost`)                         |
| `DB_USER`          | MySQL user (default `root`)                              |
| `DB_PASSWORD`      | MySQL password                                           |
| `DB_NAME`          | Database name (default `counselink`)                     |
| `DB_PORT`          | MySQL port (default `3306`)                              |
| `JWT_SECRET`       | Long random string used to sign JWTs                     |
| `JWT_EXPIRES_IN`   | Token lifetime (default `1d`)                            |
| `EMAIL_HOST`       | SMTP host (default `smtp.gmail.com`)                     |
| `EMAIL_PORT`       | SMTP port (default `587`)                                |
| `EMAIL_SECURE`     | `false` for STARTTLS on port 587                         |
| `EMAIL_USER`       | Sender address                                           |
| `EMAIL_PASS`       | Gmail app password (NOT regular Gmail password)          |
| `EMAIL_FROM`       | Display name + address (e.g. `"CounselLink <user@x>"`)   |

## Project Structure

```
counselLink/
├── backend/                # Express + MySQL API (port 5000)
│   ├── config/             # DB connection
│   ├── controllers/        # Route handlers (auth, admin, appointments, …)
│   ├── middleware/         # Auth middleware, etc.
│   ├── routes/             # Express routers
│   ├── services/           # email.service.js
│   ├── uploads/            # Uploaded COR files (gitignored)
│   ├── migrations/         # Incremental SQL migrations
│   ├── schema.sql          # DB schema
│   ├── seed.sql            # Seeded staff accounts
│   ├── server.js           # Entry point
│   ├── package.json
│   └── .env.example
├── frontend/               # React + Vite app (port 5173)
│   ├── public/             # Static assets
│   ├── src/
│   │   ├── components/
│   │   ├── context/        # AuthContext, AppointmentsContext, …
│   │   ├── data/
│   │   ├── pages/
│   │   │   ├── admin/      # Admin pages
│   │   │   ├── counselor/  # Counselor pages
│   │   │   ├── dashboard/  # Per-role dashboards
│   │   │   ├── rep/        # College rep pages
│   │   │   └── student/    # Student pages
│   │   ├── utils/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
├── README.md
└── PROGRESS.md
```

## API Routes

All under `/api`.

| Group           | Base path             |
| --------------- | --------------------- |
| Health          | `GET /api/health`     |
| Auth            | `/api/auth`           |
| Admin           | `/api/admin`          |
| Uploads (COR)   | `/api/uploads`        |
| Appointments    | `/api/appointments`   |
| Notifications   | `/api/notifications`  |
| Tests           | `/api/tests`          |
| Test results    | `/api/test-results`   |
| Messages        | `/api/messages`       |
| Reports         | `/api/reports`        |

## Available Scripts

`frontend/`:
- `npm run dev` — Start Vite dev server
- `npm run build` — Production build
- `npm run preview` — Preview production build
- `npm run lint` — Run ESLint

`backend/`:
- `npm run dev` — Start backend with `node --watch`
- `npm start` — Start backend without watch

## Troubleshooting

**Login shows "Unable to connect to server"** — check that the backend is running on port 5000 (`http://localhost:5000/api/health` should return `{"status":"ok"}`). If the backend is up, the message means the response could not be parsed; check the backend console for errors.

**Login returns "Invalid credentials"** — verify the seeded users exist (`SELECT email, role FROM users;` in the `counselink` DB). If the seed was run before the latest hash update, re-run `mysql -u root -p < backend\seed.sql` after `TRUNCATE TABLE users;`.

**Port already in use** — change `PORT` in `backend\.env` for the backend, or set `VITE_PORT` in `frontend\.env` for Vite.

**MySQL access denied** — confirm `DB_USER` and `DB_PASSWORD` in `backend\.env` match your local MySQL setup.

## License

MIT
