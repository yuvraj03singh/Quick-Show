import Booking from "../model/Booking.js";
import { clerkClient } from "@clerk/express";
import Movie from "../model/Movie.js";
import { getAuth } from "@clerk/express";
//api controller to get user bookings

export const getUserBookings = async (req, res) => {
    try {
        const user = req.auth?.userId;

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }

        const bookings = await Booking.find({ user}).populate({
            path: "show",
            populate: { path: "movie" },
        }).sort({ createdAt: -1 });
        res.json({
            success: true,
            bookings,
        });
    }catch(error){
     console.error(error);
     res.json({
        success:false,
        message:"Error occurred while fetching user bookings",
     })


    }}


    //api controller function to update favorite movie for user

    export const updateFavorite = async (req, res) => {
        try {
            const { movieId } = req.body;   
            const userId = req.auth?.userId;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: "Unauthorized",
                });
            }

            const user = await clerkClient.users.getUser(userId);

            if (!user.privateMetadata.favorites) {
                user.privateMetadata.favorites = [];
            }

            if (!user.privateMetadata.favorites.includes(movieId)) {
                user.privateMetadata.favorites.push(movieId);
            } else{
                user.privateMetadata.favorites = user.privateMetadata.favorites.filter(item => item !== movieId);
            }
            await clerkClient.users.updateUserMetadata(userId, {
                privateMetadata: user.privateMetadata
            })

            res.json({
                success: true,
                message: "Favorite movie updated successfully",
            });
        

        }catch (error) {
            console.error(error);
            res.json({
                success: false,
                message: "Error occurred while updating favorite movie",
            });
        }
    };


    export const getFavorites = async (req, res) => {
        try {
            
            const { userId } = getAuth(req);
            //  console.log("AUTH:", req.auth);
            //  console.log("AUTH HEADER:", req.headers.authorization);

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: "Unauthorized",
                });
            }

            const user = await clerkClient.users.getUser(userId);

            const favorites=user.privateMetadata.favorites || [];

            //getting movie from database

            const movies = await Movie.find({ _id: { $in: favorites } });
            res.json({
                success: true,
                favorites: movies,
            });
        } catch (error) {
            console.error(error);
            res.json({
                success: false,
                message: "Error occurred while fetching favorite movies",
            });
        }
    };
