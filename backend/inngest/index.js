import { Inngest } from "inngest";
import User from "../model/User.js";
import connectDB from "../configs/db.js";
import mongoose from "mongoose";

// Create Inngest client
export const inngest = new Inngest({ id: "movie-ticket-booking" });

// Sync user creation from Clerk
const syncUserCreation = inngest.createFunction(
  {
    id: "sync-user-from-clerk",
    triggers: { event: "clerk/user.created" },
  },
  async ({ event }) => {
    try {
      if (mongoose.connection.readyState !== 1) await connectDB();

      const payload = event?.data?.user || event?.data || {};
      const { id, first_name, last_name, email_addresses, image_url } = payload;

      const email = email_addresses?.[0]?.email_address || "";
      const name = `${first_name || ""} ${last_name || ""}`.trim() || (email ? email.split("@")[0] : "") || "User";
      const image = image_url || "";

      const userData = {
        _id: id,
        name,
        email,
        image,
      };

      console.log("Creating User:", JSON.stringify(userData));

      const user = await User.findByIdAndUpdate(id, userData, {
        returnDocument: "after",
        upsert: true,
        setDefaultsOnInsert: true,
      });

      console.log("User Created/Synced Successfully:", user);
    } catch (error) {
      console.error("User Creation Error:", error);
    }
  }
);

// Sync user deletion from Clerk
const syncUserDeletion = inngest.createFunction(
  {
    id: "delete-user-with-clerk",
    triggers: { event: "clerk/user.deleted" },
  },
  async ({ event }) => {
    try {
      if (mongoose.connection.readyState !== 1) await connectDB();

      const payload = event?.data?.user || event?.data || {};
      const { id } = payload;

      await User.findByIdAndDelete(id);

      console.log("User Deleted Successfully:", id);
    } catch (error) {
      console.error("User Deletion Error:", error);
    }
  }
);

// Sync user update from Clerk
const syncUserUpdation = inngest.createFunction(
  {
    id: "update-user-from-clerk",
    triggers: { event: "clerk/user.updated" },
  },
  async ({ event }) => {
    try {
      if (mongoose.connection.readyState !== 1) await connectDB();

      const payload = event?.data?.user || event?.data || {};
      const { id, first_name, last_name, email_addresses, image_url } = payload;

      const email = email_addresses?.[0]?.email_address || "";
      const name = `${first_name || ""} ${last_name || ""}`.trim() || (email ? email.split("@")[0] : "") || "User";
      const image = image_url || "";

      const userData = {
        _id: id,
        name,
        email,
        image,
      };

      const updatedUser = await User.findByIdAndUpdate(id, userData, {
        returnDocument: "after",
        upsert: true,
      });

      console.log("User Updated Successfully:", updatedUser);
    } catch (error) {
      console.error("User Update Error:", error);
    }
  }
);

// Export all functions
export const functions = [
  syncUserCreation,
  syncUserDeletion,
  syncUserUpdation,
];