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

Frontend talks to backend at `http://localhost:5000/api/*`. The frontend can override this via `VITE_API_BASE` in a root `.env`.

## Prerequisites

- Node.js v18+
- MySQL 8
- npm

## Setup

```powershell
# 1. Install dependencies
npm install
cd backend ; npm install ; cd ..

# 2. Configure backend env
copy backend\.env.example backend\.env
# Edit backend\.env and fill in DB_PASSWORD, EMAIL_USER, EMAIL_PASS

# 3. Create the DB and seed staff accounts
mysql -u root -p < backend\schema.sql
mysql -u root -p < backend\seed.sql
```

## Running

Open two terminals:

```powershell
# Terminal 1 — backend
cd backend
npm run dev          # starts on http://localhost:5000

# Terminal 2 — frontend
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
counselLink-main/
├── backend/
│   ├── config/             # DB connection
│   ├── controllers/        # Route handlers (auth, admin, appointments, …)
│   ├── middleware/         # Auth middleware, etc.
│   ├── routes/             # Express routers
│   ├── services/           # email.service.js
│   ├── uploads/            # Uploaded COR files (gitignored)
│   ├── schema.sql          # DB schema
│   ├── seed.sql            # Seeded staff accounts
│   ├── server.js           # Entry point
│   └── .env.example
├── public/                 # Static assets
├── src/
│   ├── components/
│   ├── context/            # AuthContext, AppointmentsContext, …
│   ├── data/
│   ├── hooks/
│   ├── pages/
│   │   ├── admin/          # Admin pages
│   │   ├── counselor/      # Counselor pages
│   │   ├── dashboard/      # Per-role dashboards
│   │   ├── rep/            # College rep pages
│   │   └── student/        # Student pages
│   ├── utils/
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── package.json
├── vite.config.js
└── tailwind.config.js
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

Root (frontend):
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

**Port already in use** — change `PORT` in `backend\.env` for the backend, or set `VITE_PORT` in a root `.env` for Vite.

**MySQL access denied** — confirm `DB_USER` and `DB_PASSWORD` in `backend\.env` match your local MySQL setup.

## License

MIT
