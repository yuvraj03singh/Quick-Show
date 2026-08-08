import Booking from "../model/Booking.js";
import { clerkClient } from "@clerk/express";
import Movie from "../model/Movie.js";
import { getAuth } from "@clerk/express";
import User from "../model/User.js";
//api controller to get user bookings

const upsertUserFromClerk = async (userId, fallbackData = {}) => {
    let clerkUser = null;
    try {
        if (userId) {
            clerkUser = await clerkClient.users.getUser(userId);
        }
    } catch (err) {
        console.warn("Could not fetch user details from Clerk API:", err.message);
    }

    const targetId = userId || clerkUser?.id || fallbackData.userId;
    if (!targetId) {
        throw new Error("No valid user ID provided for synchronization");
    }

    const email = clerkUser?.emailAddresses?.[0]?.emailAddress || fallbackData.email || "";
    const firstName = clerkUser?.firstName || fallbackData.firstName || "";
    const lastName = clerkUser?.lastName || fallbackData.lastName || "";
    const name = `${firstName} ${lastName}`.trim() || fallbackData.name || (email ? email.split("@")[0] : "") || "User";
    const image = clerkUser?.imageUrl || fallbackData.image || "";

    const userData = {
        _id: targetId,
        name,
        email,
        image,
    };

    return await User.findByIdAndUpdate(targetId, userData, {
        returnDocument: "after",
        upsert: true,
        setDefaultsOnInsert: true,
    });
};

export const syncUser = async (req, res) => {
    try {
        console.log("Received /api/user/sync request with body:", JSON.stringify(req.body));

        let authUserId = null;
        try {
            authUserId = getAuth(req)?.userId;
        } catch (e) {
            console.warn("getAuth failed:", e.message);
        }

        const userId = authUserId || req.body?.userId;

        if (!userId) {
            console.error("Sync user failed: Missing userId in auth and body");
            return res.status(401).json({
                success: false,
                message: "Unauthorized: Missing user authentication or user ID",
            });
        }

        const syncedUser = await upsertUserFromClerk(userId, req.body);
        console.log("User synced successfully to MongoDB:", syncedUser?._id);

        res.json({
            success: true,
            message: "User synced successfully",
            user: syncedUser,
        });
    } catch (error) {
        console.error("Error syncing user:", error);
        res.status(500).json({
            success: false,
            message: "Error occurred while syncing user",
            error: error.message,
        });
    }
};

export const getUserBookings = async (req, res) => {
    try {
        const {userId} = getAuth(req);

        if (!userId) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized",
            });
        }

        await upsertUserFromClerk(userId);

        const bookings = await Booking.find({ user: userId }).populate({
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
            const {userId} = getAuth(req);

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    message: "Unauthorized",
                });
            }

            await upsertUserFromClerk(userId);

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

            await upsertUserFromClerk(userId);

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
