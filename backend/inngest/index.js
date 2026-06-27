import { Inngest } from "inngest";
import User from "../model/User.js";

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
      const { id, first_name, last_name, email_addresses, image_url } =
        event.data;

      const userData = {
        _id: id,
        name: `${first_name || ""} ${last_name || ""}`.trim(),
        email: email_addresses?.[0]?.email_address || "",
        image: image_url || "",
      };

      console.log("Creating User:", userData);

      const user = await User.create(userData);

      console.log("User Created Successfully:", user);
    } catch (error) {
      console.log("User Creation Error:", error.message);
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
      const { id } = event.data;

      await User.findByIdAndDelete(id);

      console.log("User Deleted Successfully:", id);
    } catch (error) {
      console.log("User Deletion Error:", error.message);
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
      const { id, first_name, last_name, email_addresses, image_url } =
        event.data;

      const userData = {
        _id: id,
        name: `${first_name || ""} ${last_name || ""}`.trim(),
        email: email_addresses?.[0]?.email_address || "",
        image: image_url || "",
      };

      const updatedUser = await User.findByIdAndUpdate(id, userData, {
        new: true,
        upsert: true,
      });

      console.log("User Updated Successfully:", updatedUser);
    } catch (error) {
      console.log("User Update Error:", error.message);
    }
  }
);

// Export all functions
export const functions = [
  syncUserCreation,
  syncUserDeletion,
  syncUserUpdation,
];