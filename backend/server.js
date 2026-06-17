import express from "express";
// Patches Express 4 so a rejected async route handler is forwarded to the
// error-handling middleware instead of becoming an unhandled rejection that
// crashes the whole process. Must be imported before the routes are used.
import "express-async-errors";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import { testConnection } from "./config/db.js";
import { addClient } from "./events.js";
import authRoutes from "./routes/auth.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import uploadsRoutes from "./routes/uploads.routes.js";
import appointmentsRoutes from "./routes/appointments.routes.js";
import notificationsRoutes from "./routes/notifications.routes.js";
import testsRoutes from "./routes/tests.routes.js";
import testResultsRoutes from "./routes/test-results.routes.js";
import messagesRoutes from "./routes/messages.routes.js";
import reportsRoutes from "./routes/reports.routes.js";
import announcementsRoutes from "./routes/announcements.routes.js";
import usersRoutes from "./routes/users.routes.js";
import auditLogsRoutes from "./routes/audit-logs.routes.js";
import counselingSessionsRoutes from "./routes/counseling-sessions.routes.js";
import studentInventoriesRoutes from "./routes/student-inventories.routes.js";
import studentConsentsRoutes from "./routes/student-consents.routes.js";
import feedbackRoutes from "./routes/feedback.routes.js";
import referralsRoutes from "./routes/referrals.routes.js";
import reportRequestsRoutes from "./routes/report-requests.routes.js";
import urgentCounselingRoutes from "./routes/urgent-counseling.routes.js";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

// Refuse to boot in production with a missing/placeholder JWT secret —
// every session token would be forgeable otherwise.
if (
  process.env.NODE_ENV === "production" &&
  (!process.env.JWT_SECRET || process.env.JWT_SECRET === "replace_with_a_long_random_string")
) {
  console.error("FATAL: JWT_SECRET is not set to a real secret. Refusing to start.");
  process.exit(1);
}

const app = express();

// Needed on Render/other proxies so rate limiting sees real client IPs.
app.set("trust proxy", 1);

// crossOriginResourcePolicy is relaxed so /uploads images can be displayed
// by the frontend on a different origin (Vercel).
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));

const allowedOrigins = (process.env.CORS_ORIGINS || "http://localhost:5173,http://localhost:5174")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
app.use(cors({ origin: allowedOrigins, credentials: true }));
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

// Real-time stream (Server-Sent Events). The browser's EventSource can't send
// an Authorization header, so the JWT comes in as a query param. We hold the
// connection open and push typed "something changed" signals via events.js.
app.get("/api/events", (req, res) => {
  let user;
  try {
    user = jwt.verify(req.query.token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).end();
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    "X-Accel-Buffering": "no", // disable proxy buffering (nginx/Render)
  });
  res.write("retry: 5000\n\n"); // tell the client how long to wait before reconnecting
  res.write(": connected\n\n"); // open the stream immediately

  const remove = addClient(user, res);

  // Heartbeat so idle proxies/load balancers don't drop the connection.
  const heartbeat = setInterval(() => res.write(": ping\n\n"), 25000);

  req.on("close", () => {
    clearInterval(heartbeat);
    remove();
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/uploads", uploadsRoutes);
app.use("/api/appointments", appointmentsRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/tests", testsRoutes);
app.use("/api/test-results", testResultsRoutes);
app.use("/api/messages", messagesRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/announcements", announcementsRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/audit-logs", auditLogsRoutes);
app.use("/api/counseling-sessions", counselingSessionsRoutes);
app.use("/api/student-inventories", studentInventoriesRoutes);
app.use("/api/student-consents", studentConsentsRoutes);
app.use("/api/feedback", feedbackRoutes);
app.use("/api/referrals", referralsRoutes);
app.use("/api/report-requests", reportRequestsRoutes);
app.use("/api/urgent-counseling-requests", urgentCounselingRoutes);

// Central error handler. Any error thrown in a route (including async ones,
// thanks to express-async-errors) lands here and returns a 500 for that single
// request instead of taking down the server. Express identifies this as the
// error handler by its four arguments, so `next` must stay in the signature.
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error(`Unhandled error on ${req.method} ${req.originalUrl}:`, err);
  if (res.headersSent) return next(err);
  res.status(500).json({ message: "Internal server error" });
});

// Last-resort safety net. If an error ever escapes the request lifecycle (e.g.
// in the SSE stream or a background task), log it and keep the server alive
// rather than letting Node terminate the process.
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
});

const port = process.env.PORT || 5000;

const start = async () => {
  try {
    await testConnection();
    console.log("Database connected");
    app.listen(port, () => console.log(`Server running on port ${port}`));
  } catch (error) {
    console.error("Failed to connect to database", error);
    process.exit(1);
  }
};

start();
