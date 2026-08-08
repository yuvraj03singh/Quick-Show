
import express from "express";
import cors from "cors";
import "dotenv/config";
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
const app = express();
const port = process.env.PORT || 3000;

await connectDB();

// Stripe webhook endpoint
app.use(
  "/api/stripe",
  express.raw({ type: "application/json" }),
  stripeWebhookHandler
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

      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
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

app.listen(port, () =>
  console.log(`Server listening at http://localhost:${port}`)
);

