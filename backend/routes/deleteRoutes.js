import express from "express";
import { cancelBooking } from "../controllers/deleteBooking.js";
import { protectRoute } from "../middleware/auth.js";

const router = express.Router();

router.delete("/cancel/:bookingId", protectRoute, cancelBooking);

export default router;
