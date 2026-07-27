import React, { useCallback, useEffect, useState } from "react";
import BlurCircle from "../components/BlurCircle";
import Loading from "../components/Loading";
import timeFormat from "../lib/timeFormat";
import { dateFormat } from "../lib/dateFormat";
import { useAppContext } from "../context/AppContext";
import toast from "react-hot-toast";

const MyBooking = () => {
  const currency = import.meta.env.VITE_CURRENCY;

  const { axios, getToken, user, image_base_url } = useAppContext();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const getMyBookings = useCallback(async () => {
    try {
      setLoading(true);

      const token = await getToken();

      const { data } = await axios.get("/api/user/bookings", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (data.success) {
        setBookings(data.bookings || []);
      } else {
        toast.error(data.message);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to fetch bookings");
    } finally {
      setLoading(false);
    }
  }, [axios, getToken]);

  const handlePayNow = useCallback((paymentLink) => {
    if (!paymentLink) {
      return toast.error("Payment link not found");
    }

    window.location.assign(paymentLink);
  }, []);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    getMyBookings();
  }, [user, getMyBookings]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const hasPendingPayment = bookings.some(
      (booking) => !booking.isPaid && booking.paymentLink,
    );

    if (!hasPendingPayment) {
      return;
    }

    const pollId = setInterval(() => {
      getMyBookings();
    }, 5000);

    return () => clearInterval(pollId);
  }, [bookings, user, getMyBookings]);

  if (loading) {
    return <Loading />;
  }

  return (
    <section className="relative min-h-[80vh] px-6 pt-30 md:px-16 md:pt-40 lg:px-40">
      <BlurCircle top="100px" left="100px" />
      <BlurCircle bottom="0px" left="600px" />

      <h1 className="mb-4 text-lg font-semibold">My Bookings</h1>

      {!bookings.length ? (
        <div className="flex justify-center items-center h-60">
          <p className="text-gray-400 text-lg">No Bookings Found</p>
        </div>
      ) : (
        bookings.map((booking) => {
          const { _id, amount, bookedSeats, paymentLink, isPaid, show } =
            booking;

          const movie = show.movie;

          return (
            <div
              key={_id}
              className="mt-4 flex max-w-3xl flex-col justify-between rounded-lg border border-primary/20 bg-primary/8 p-2 md:flex-row"
            >
              <div className="flex flex-col md:flex-row">
                <img
                  loading="lazy"
                  src={image_base_url + movie.poster_path}
                  alt={movie.title}
                  className="aspect-video h-auto rounded object-cover object-bottom md:max-w-45"
                />

                <div className="flex flex-col p-4">
                  <h2 className="text-lg font-semibold">{movie.title}</h2>

                  <p className="text-sm text-gray-400">
                    {timeFormat(movie.runtime)}
                  </p>

                  <p className="mt-auto text-sm text-gray-400">
                    {dateFormat(show.showDateTime)}
                  </p>
                </div>
              </div>

              <div className="flex flex-col justify-between p-4 md:items-end md:text-right">
                <div className="flex items-center gap-4">
                  <p className="mb-3 text-2xl font-semibold">
                    {currency} {amount}
                  </p>

                  {isPaid ? (
                    <span className="mb-3 rounded-full bg-green-600/20 px-4 py-1.5 text-sm font-medium text-green-300">
                      Paid
                    </span>
                  ) : (
                    <button
                      onClick={() => handlePayNow(paymentLink)}
                      className="mb-3 cursor-pointer rounded-full bg-primary px-4 py-1.5 text-sm font-medium active:scale-95 transition"
                    >
                      Pay Now
                    </button>
                  )}
                </div>

                <div className="space-y-1 text-sm">
                  <p>
                    <span className="text-gray-400">Total Tickets:</span>{" "}
                    {bookedSeats.length}
                  </p>

                  <p>
                    <span className="text-gray-400">Seat Numbers:</span>{" "}
                    {bookedSeats.join(", ")}
                  </p>
                </div>
              </div>
            </div>
          );
        })
      )}
    </section>
  );
};

export default MyBooking;
