
import Stripe from "stripe";
import Booking from "../model/Booking.js";
import { syncShowOccupiedSeats } from "../utils/occupiedSeats.js";

const markBookingAsPaid = async (bookingId) => {
  if (!bookingId) {
    return;
  }

  const booking = await Booking.findById(bookingId);

  if (!booking || booking.isPaid) {
    return;
  }

  const conflictingBooking = await Booking.findOne({
    show: booking.show,
    isPaid: true,
    _id: { $ne: booking._id },
    bookedSeats: { $in: booking.bookedSeats },
  }).select("_id");

  if (conflictingBooking) {
    console.error(
      `Paid seat conflict for booking ${booking._id}. Conflicting booking: ${conflictingBooking._id}`
    );
    return;
  }

  await Booking.findByIdAndUpdate(bookingId, {
    isPaid: true,
    paymentLink: null,
  });
  await syncShowOccupiedSeats(booking.show);
};

export const stripeWebhookHandler = async (req, res) => {
  const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);

  const sig = req.headers["stripe-signature"];

  let event;

  try {
    event = stripeInstance.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    return res.status(400).send(`Webhook Error: ${error.message}`);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;

        if (session.payment_status !== "paid") {
          break;
        }

        await markBookingAsPaid(session.metadata?.bookingId);
        break;
      }

      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object;

        const sessionList =
          await stripeInstance.checkout.sessions.list({
            payment_intent: paymentIntent.id,
          });

        const session = sessionList.data[0];

        if (session) {
          await markBookingAsPaid(session.metadata?.bookingId);
        }
        break;
      }

      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error("Error processing webhook event:", error);
    res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }       
};



export default stripeWebhookHandler;