import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { testConnection } from "./config/db.js";
import authRoutes from "./routes/auth.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import uploadsRoutes from "./routes/uploads.routes.js";
import appointmentsRoutes from "./routes/appointments.routes.js";
import notificationsRoutes from "./routes/notifications.routes.js";
import testsRoutes from "./routes/tests.routes.js";
import testResultsRoutes from "./routes/test-results.routes.js";
import messagesRoutes from "./routes/messages.routes.js";
import reportsRoutes from "./routes/reports.routes.js";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();

app.use(cors({ origin: "http://localhost:5173", credentials: true }));
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/uploads", uploadsRoutes);
app.use("/api/appointments", appointmentsRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/tests", testsRoutes);
app.use("/api/test-results", testResultsRoutes);
app.use("/api/messages", messagesRoutes);
app.use("/api/reports", reportsRoutes);

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
