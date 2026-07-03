
import Stripe from "stripe";
import Booking from "../model/Booking.js";

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
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object;

        const sessionList =
          await stripeInstance.checkout.sessions.list({
            payment_intent: paymentIntent.id,
          });

        const session = sessionList.data[0];

        if (!session) {
          return res.status(404).json({
            success: false,
            message: "Session not found",
          });
        }

        const { bookingId } = session.metadata;

        await Booking.findByIdAndUpdate(bookingId, {
          isPaid: true,
          paymentLink: null,
        });

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