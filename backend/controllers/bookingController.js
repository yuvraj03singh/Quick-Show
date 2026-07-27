import Show from "../model/Show.js";
import Booking from "../model/Booking.js";
import { getAuth } from "@clerk/express";
import Stripe from "stripe";
import { getOccupiedSeatsFromBookings, syncShowOccupiedSeats } from "../utils/occupiedSeats.js";



// Check seat availability
const checkSeatAvailability = async (showId, selectedSeats) => {
  try {
    const occupiedSeats = await getOccupiedSeatsFromBookings(showId);

    const isAnySeatTaken = selectedSeats.some(
      (seat) => occupiedSeats[seat]
    );

    return !isAnySeatTaken;
  } catch (error) {
    console.error("Error checking seat availability:", error);
    return false;
  }
};

// Create booking
export const createBooking = async (req, res) => {
  try {
    const { userId } = getAuth(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. Please login first.",
      });
    }

    const { showId, selectedSeats } = req.body;

    if (!showId || !selectedSeats?.length) {
      return res.status(400).json({
        success: false,
        message: "Show ID and seats are required",
      });
    }

    // Check seat availability
    const isAvailable = await checkSeatAvailability(
      showId,
      selectedSeats
    );

    if (!isAvailable) {
      return res.status(400).json({
        success: false,
        message: "Selected seats are already booked",
      });
    }

    // Get show details
    const showData = await Show.findById(showId).populate("movie");

    if (!showData) {
      return res.status(404).json({
        success: false,
        message: "Show not found",
      });
    }

    // Create booking
    const booking = await Booking.create({
      user: userId,
      show: showId,
      amount: showData.showPrice * selectedSeats.length,
      bookedSeats: selectedSeats,
    });

    // add payment method using stripe
    const line_items = [
      {
        price_data: {
          currency: "inr",
          product_data: {
            name: showData.movie.title,
          },
          unit_amount: Math.floor(booking.amount) * 100,
        },
        quantity: 1,
      },
    ];

    const origin = req.headers.origin || `http://${req.headers.host}`;

    const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);

    const session = await stripeInstance.checkout.sessions.create({
      success_url: `${origin}/loading/my-bookings`,
      cancel_url: `${origin}/my-bookings`,
      line_items: line_items,
      mode: "payment",
      metadata: {
        bookingId: booking._id.toString(),
      },
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // 30 minutes from now
    });

    booking.paymentLink = session.url;
    await booking.save();

    res.json({
      success: true,
      url: session.url,
      booking,
    });
  } catch (error) {
    console.log("Create Booking Error:", error.message);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// Get occupied seats
export const getOccupiedSeats = async (req, res) => {
  try {
    const { showId } = req.params;

    const showData = await syncShowOccupiedSeats(showId);

    if (!showData) {
      return res.status(404).json({
        success: false,
        message: "Show not found",
      });
    }

    const occupiedSeats = Object.keys(showData.occupiedSeats || {});

    res.json({
      success: true,
      occupiedSeats,
    });
  } catch (error) {
    console.log(error.message);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};