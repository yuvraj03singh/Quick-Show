import Booking from "../model/Booking.js";
import Show from "../model/Show.js";

const areSeatMapsEqual = (left = {}, right = {}) => {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);

  if (leftKeys.length !== rightKeys.length) {
    return false;
  }

  return rightKeys.every((seat) => left[seat] === right[seat]);
};

export const getOccupiedSeatsFromBookings = async (showId) => {
  const bookings = await Booking.find({ show: showId, isPaid: true }).select("user bookedSeats");

  return bookings.reduce((occupiedSeats, booking) => {
    (booking.bookedSeats || []).forEach((seat) => {
      occupiedSeats[seat] = booking.user;
    });

    return occupiedSeats;
  }, {});
};

export const syncShowOccupiedSeats = async (showOrId) => {
  const show = typeof showOrId === "object" ? showOrId : await Show.findById(showOrId);

  if (!show) {
    return null;
  }

  const occupiedSeats = await getOccupiedSeatsFromBookings(show._id);

  if (!areSeatMapsEqual(show.occupiedSeats || {}, occupiedSeats)) {
    show.occupiedSeats = occupiedSeats;
    show.markModified("occupiedSeats");
    await show.save();
  } else {
    show.occupiedSeats = occupiedSeats;
  }

  return show;
};