<div align="center">

# CounselLink

**A student counseling management system for Mindanao State University (MSU)**

[![Status](https://img.shields.io/badge/status-active%20development-blue)](#)
[![License](https://img.shields.io/badge/license-MIT-green)](#license)
[![Node](https://img.shields.io/badge/node-%E2%89%A518-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![Express](https://img.shields.io/badge/Express-4.x-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![MySQL](https://img.shields.io/badge/MySQL-8-4479A1?logo=mysql&logoColor=white)](https://www.mysql.com/)
[![Tailwind](https://img.shields.io/badge/Tailwind-3.x-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)

</div>

---

## Overview

CounselLink is a full-stack web application that streamlines the guidance and counseling workflow at MSU. Students, counselors, college representatives, and administrators each get a dedicated workspace for scheduling appointments, exchanging messages, managing referrals, and producing reports — all backed by a single source of truth.

This repository is the capstone project of a 2 student and is currently under active development.

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Repository Layout](#repository-layout)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Running the Application](#running-the-application)
- [Pulling the Latest Changes](#pulling-the-latest-changes)
- [Default Login Credentials](#default-login-credentials)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Available Scripts](#available-scripts)
- [Troubleshooting](#troubleshooting)
- [License](#license)

## Features

- **Role-based access** for Students, Counselors, College Representatives, and Administrators
- **Appointment management** — request, schedule, accept or reject, with urgent-flagging and completion tracking
- **Direct messaging** between students and counselors
- **Notifications and announcement broadcasts** across roles
- **Psychological test requests and results** workflow
- **Referrals** between college representatives and counselors with a state-machine lifecycle
- **Counseling session records** and finalization with downloadable reports
- **Administrative tools** for approving student registrations and managing staff
- **Analytics and reporting** dashboards
- **Responsive UI** optimised for desktop, tablet, and mobile

## Architecture

```
┌──────────────────────────┐        HTTP / JSON         ┌──────────────────────────┐
│  Frontend (Vite + React) │ ─────────────────────────► │  Backend (Express, ESM)  │
│      localhost:5173      │ ◄───────────────────────── │      localhost:5000      │
└──────────────────────────┘    JWT bearer + cookies    └─────────────┬────────────┘
                                                                       │ mysql2
                                                                       ▼
                                                          ┌──────────────────────────┐
                                                          │   MySQL 8 ("counselink") │
                                                          └──────────────────────────┘
```

- The frontend calls `http://localhost:5000/api/*` by default.
- Override the API base URL by setting `VITE_API_BASE` in `frontend/.env`.
- Authentication uses JWT bearer tokens; passwords are hashed with `bcryptjs`.
- Outbound email (password reset, notifications) is delivered through SMTP via `nodemailer`.

## Tech Stack

| Layer       | Technology                                                                 |
| ----------- | -------------------------------------------------------------------------- |
| Frontend    | React 19, React Router 7, Tailwind CSS 3, Recharts, Lucide icons, rolldown-vite |
| Backend     | Node.js (ESM), Express 4, JSON Web Tokens, Multer, Nodemailer              |
| Database    | MySQL 8 with incremental SQL migrations                                    |
| Tooling     | ESLint, PostCSS, Autoprefixer                                              |

## Repository Layout

```
CounselLink/
├── backend/                # Express + MySQL API (port 5000)
│   ├── config/             # Database connection
│   ├── controllers/        # Route handlers (auth, admin, appointments, …)
│   ├── middleware/         # Authentication, error handling, etc.
│   ├── routes/             # Express routers
│   ├── services/           # email.service.js and other integrations
│   ├── uploads/            # Uploaded COR files (gitignored)
│   ├── migrations/         # Incremental SQL migrations (001 … 012)
│   ├── schema.sql          # Database schema
│   ├── seed.sql            # Seeded staff accounts
│   ├── server.js           # Application entry point
│   ├── package.json
│   └── .env.example
├── frontend/               # React + Vite app (port 5173)
│   ├── public/             # Static assets
│   ├── src/
│   │   ├── components/
│   │   ├── context/        # AuthContext, AppointmentsContext, …
│   │   ├── data/
│   │   ├── pages/
│   │   │   ├── admin/      # Administrator pages
│   │   │   ├── counselor/  # Counselor pages
│   │   │   ├── dashboard/  # Per-role dashboards
│   │   │   ├── rep/        # College representative pages
│   │   │   └── student/    # Student pages
│   │   ├── utils/
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
└── README.md
```

The frontend and backend are independent npm packages and maintain their own `package.json` and `node_modules`.

## Prerequisites

| Requirement | Version    |
| ----------- | ---------- |
| Node.js     | 18 or newer |
| npm         | bundled with Node |
| MySQL       | 8.x        |

## Getting Started

```powershell
# 1. Install dependencies (each folder has its own package.json)
cd frontend ; npm install ; cd ..
cd backend  ; npm install ; cd ..

# 2. Configure backend environment variables
copy backend\.env.example backend\.env
# Open backend\.env and fill in DB_PASSWORD, EMAIL_USER, EMAIL_PASS, and JWT_SECRET

# 3. Create the database and seed staff accounts
mysql -u root -p < backend\schema.sql
mysql -u root -p < backend\seed.sql

# 4. Apply migrations (in order)
# Run every file under backend\migrations\ in numeric order:
#   001_user_profile_fields.sql  …  012_appointment_completed_status.sql
mysql -u root -p counselink < backend\migrations\001_user_profile_fields.sql
# Repeat for each subsequent migration file.
```

## Running the Application

Open two terminals:

```powershell
# Terminal 1 — backend (http://localhost:5000)
cd backend
npm run dev

# Terminal 2 — frontend (http://localhost:5173)
cd frontend
npm run dev
```

Then visit `http://localhost:5173` in your browser. A quick health check is available at `http://localhost:5000/api/health` and should return `{"status":"ok"}`.

## Pulling the Latest Changes

After every `git pull`, complete the checklist below. Skipping any step is the most common source of *"it works on my machine"* discrepancies.

```powershell
# 1. Switch to the branch in use for the current sprint, then pull.
git fetch
git checkout <active-branch>   # e.g. main, or the active feature/sprint branch
git pull

# 2. Reinstall dependencies — frontend and backend each have their own package.json
cd frontend ; npm install ; cd ..
cd backend  ; npm install ; cd ..

# 3. Apply any new database migrations
# Inspect backend\migrations\ for files added since your last pull and run them in order.
# Example:
mysql -u root -p counselink < backend\migrations\012_appointment_completed_status.sql

# 4. Sync your backend\.env with backend\.env.example
# Any key present in .env.example that is missing from your .env should be added,
# especially EMAIL_HOST / EMAIL_PORT / EMAIL_USER / EMAIL_PASS / EMAIL_FROM.

# 5. Start both servers
cd backend  ; npm run dev      # terminal 1 — backend  (:5000)
cd frontend ; npm run dev      # terminal 2 — frontend (:5173)
```

If "module not found" or "Unknown column" errors persist after these steps, share the full error with the team before assuming a regression.

## Default Login Credentials

All seeded staff accounts are pre-approved for development use.

| Role              | Email                     | Password       |
| ----------------- | ------------------------- | -------------- |
| Administrator     | `admin@msu.edu.ph`        | `admin123`     |
| Counselor (CICS)  | `counselor@msu.edu.ph`    | `counselor123` |
| Counselor (COE)   | `counselor2@msu.edu.ph`   | `counselor123` |
| Counselor (CBAA)  | `counselor3@msu.edu.ph`   | `counselor123` |
| Counselor (CHS)   | `counselor4@msu.edu.ph`   | `counselor123` |
| College Rep       | `rep@msu.edu.ph`          | `rep123`       |
| College Rep       | `rep2@msu.edu.ph`         | `rep123`       |
| College Rep       | `rep3@msu.edu.ph`         | `rep123`       |

Students register through the signup form (with COR upload) and must be approved by an administrator before they can log in.

> **Security note:** these credentials are for local development only. Rotate every secret before any non-local deployment.

## Environment Variables

`backend/.env`:

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
| `EMAIL_PASS`       | Gmail app password (not a regular Gmail password)        |
| `EMAIL_FROM`       | Display name + address (e.g. `"CounselLink <user@x>"`)   |

`frontend/.env` (optional):

| Variable        | Purpose                                                    |
| --------------- | ---------------------------------------------------------- |
| `VITE_API_BASE` | Override the backend base URL (default `http://localhost:5000/api`) |
| `VITE_PORT`     | Override the Vite dev-server port                          |

## API Reference

All routes are prefixed with `/api`.

| Group           | Base path             |
| --------------- | --------------------- |
| Health          | `GET /api/health`     |
| Authentication  | `/api/auth`           |
| Administration  | `/api/admin`          |
| Uploads (COR)   | `/api/uploads`        |
| Appointments    | `/api/appointments`   |
| Notifications   | `/api/notifications`  |
| Tests           | `/api/tests`          |
| Test Results    | `/api/test-results`   |
| Messages        | `/api/messages`       |
| Referrals       | `/api/referrals`      |
| Reports         | `/api/reports`        |

## Available Scripts

**`frontend/`**

| Command           | Description                              |
| ----------------- | ---------------------------------------- |
| `npm run dev`     | Start the Vite development server        |
| `npm run build`   | Produce a production build               |
| `npm run preview` | Preview the production build locally     |
| `npm run lint`    | Run ESLint over the source tree          |

**`backend/`**

| Command         | Description                              |
| --------------- | ---------------------------------------- |
| `npm run dev`   | Start the server with `node --watch`     |
| `npm start`     | Start the server without watch mode      |

## Troubleshooting

<details>
<summary><strong>Login shows "Unable to connect to server"</strong></summary>

Confirm the backend is running on port 5000. `GET http://localhost:5000/api/health` should return `{"status":"ok"}`. If the backend is up, the message indicates that the response could not be parsed — inspect the backend console for errors.
</details>

<details>
<summary><strong>Login returns "Invalid credentials"</strong></summary>

Verify the seeded users exist (`SELECT email, role FROM users;` in the `counselink` database). If the seed predates the latest password-hash update, re-run it after clearing the table:

```sql
TRUNCATE TABLE users;
```

Then `mysql -u root -p < backend\seed.sql`.
</details>

<details>
<summary><strong>Port already in use</strong></summary>

Set `PORT` in `backend\.env` for the backend, or `VITE_PORT` in `frontend\.env` for the Vite dev server.
</details>

<details>
<summary><strong>MySQL access denied</strong></summary>

Confirm `DB_USER` and `DB_PASSWORD` in `backend\.env` match your local MySQL configuration.
</details>

## License

Released under the [MIT License](LICENSE).
