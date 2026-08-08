import express from "express";
import cors from "cors";
import "dotenv/config";
import mongoose from "mongoose";
import { clerkMiddleware } from "@clerk/express";
import connectDB from "./configs/db.js";
import { inngest, functions } from "./inngest/index.js";
import { serve } from "inngest/express";

import showRouter from "./routes/showRoutes.js";
import bookingRouter from "./routes/bookingRoutes.js";
import deleteRouter from "./routes/deleteRoutes.js";
import adminRouter from "./routes/adminRoutes.js";
import userRouter from "./routes/userRoutes.js";
import { stripeWebhookHandler } from "./controllers/stripeWebhooks.js";
import { clerkWebhookHandler } from "./controllers/clerkWebhookController.js";

const app = express();
const port = process.env.PORT || 3000;

// Health / Status diagnostic route
app.get("/api/status", async (req, res) => {
  let dbStatus = "disconnected";
  let dbError = null;
  try {
    if (mongoose.connection.readyState === 1) {
      dbStatus = "connected";
    } else {
      await connectDB();
      dbStatus = mongoose.connection.readyState === 1 ? "connected" : "failed";
    }
  } catch (err) {
    dbStatus = "error";
    dbError = err.message;
  }

  res.json({
    success: true,
    server: "live",
    timestamp: new Date().toISOString(),
    dbStatus,
    dbError,
    envCheck: {
      hasMongodbUri: !!process.env.MONGODB_URI,
      hasClerkSecretKey: !!process.env.CLERK_SECRET_KEY,
      hasClerkPublishableKey: !!process.env.CLERK_PUBLISHABLE_KEY,
      hasClerkWebhookSecret: !!process.env.CLERK_WEBHOOK_SECRET,
    },
  });
});

// Ensure database connection before any API requests
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error("DB Connection Middleware Error:", err);
    res.status(500).json({ success: false, message: "Database connection failed", error: err.message });
  }
});

// Stripe webhook endpoint
app.use(
  "/api/stripe",
  express.raw({ type: "application/json" }),
  stripeWebhookHandler
);

// Direct Clerk Webhook endpoint
app.post(
  "/api/webhooks/clerk",
  express.json(),
  clerkWebhookHandler
);

const allowedOrigins = [
  "http://localhost:5173",
  "https://quick-show-tau-ten.vercel.app",
  ...(process.env.CLIENT_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
];

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);

      if (
        allowedOrigins.includes(origin) ||
        origin.endsWith(".vercel.app")
      ) {
        callback(null, true);
      } else {
        callback(null, true); // Fallback to allow requests in production deployment
      }
    },
    credentials: true,
  })
);

// Middleware
app.use(express.json());
app.use(clerkMiddleware());

app.get("/", (req, res) => res.send("Server is live!"));

app.use("/api/inngest", serve({ client: inngest, functions }));
app.use("/api/show", showRouter);
app.use("/api/booking", bookingRouter);
app.use("/api/delete", deleteRouter);
app.use("/api/admin", adminRouter);
app.use("/api/user", userRouter);

if (process.env.NODE_ENV !== "production") {
  app.listen(port, () =>
    console.log(`Server listening at http://localhost:${port}`)
  );
}

export default app;
