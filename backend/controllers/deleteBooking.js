
import Booking from "../model/Booking.js";

// Cancel booking
export const cancelBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;

    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    await booking.deleteOne();

    res.json({
      success: true,
      message: "Booking cancelled successfully",
    });
  } catch (error) {
    console.log("Cancel Booking Error:", error.message);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

