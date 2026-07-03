
import express from "express";
import { clerkClient, getAuth } from "@clerk/express";
import Booking from "../model/Booking.js";
import Show from "../model/Show.js";
import User from "../model/User.js";
import { syncShowOccupiedSeats } from "../utils/occupiedSeats.js";

// api to check if user is admin
export const isAdmin = async (req, res) => {
  res.json({
    success: true,
    isAdmin: true,
  });
};

// api to get dashboard data
export const getDashboardData = async (req, res) => {
  try {
    const bookings = await Booking.find({ isPaid: true });

    // removed date filter
    const activeShows = await Show.find({})
      .populate("movie")
      .sort({ showDateTime: 1 });

    await Promise.all(activeShows.map((show) => syncShowOccupiedSeats(show)));

    const totalUser = await User.countDocuments();

    const dashboardData = {
      totalBookings: bookings.length,
      totalRevenue: bookings.reduce(
        (acc, booking) => acc + booking.amount,
        0
      ),
      activeShows,
      totalUser,
    };

    res.json({
      success: true,
      dashboardData,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Error occurred while fetching dashboard data",
    });
  }
};

// api to get all shows
export const getAllShows = async (req, res) => {
  try {
    const shows = await Show.find({})
      .populate("movie")
      .sort({ showDateTime: 1 });

    await Promise.all(shows.map((show) => syncShowOccupiedSeats(show)));

    res.json({
      success: true,
      shows,
    });
  } catch (error) {
    console.error(error);

    res.json({
      success: false,
      message: "Error occurred while fetching shows",
    });
  }
};

// api to get all bookings
export const getAllBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({})
      .populate("user")
      .populate({
        path: "show",
        populate: { path: "movie" },
      })
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      bookings,
    });
  } catch (error) {
    console.error(error);

    res.json({
      success: false,
      message: "Error occurred while fetching bookings",
    });
  }
};

