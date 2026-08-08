import { Webhook } from "svix";
import User from "../model/User.js";

export const clerkWebhookHandler = async (req, res) => {
  try {
    const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

    const svix_id = req.headers["svix-id"];
    const svix_timestamp = req.headers["svix-timestamp"];
    const svix_signature = req.headers["svix-signature"];

    let evt;

    if (WEBHOOK_SECRET) {
      if (!svix_id || !svix_timestamp || !svix_signature) {
        return res
          .status(400)
          .json({ success: false, message: "Missing svix headers" });
      }

      const wh = new Webhook(WEBHOOK_SECRET);
      const payloadString =
        typeof req.body === "string" ? req.body : JSON.stringify(req.body);

      try {
        evt = wh.verify(payloadString, {
          "svix-id": svix_id,
          "svix-timestamp": svix_timestamp,
          "svix-signature": svix_signature,
        });
      } catch (err) {
        console.error("Clerk Webhook verification failed:", err.message);
        return res
          .status(400)
          .json({ success: false, message: "Webhook verification failed" });
      }
    } else {
      evt = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    }

    const { type, data } = evt || {};

    if (type === "user.created" || type === "user.updated") {
      const { id, first_name, last_name, email_addresses, image_url } =
        data || {};
      const email = email_addresses?.[0]?.email_address || "";
      const name =
        `${first_name || ""} ${last_name || ""}`.trim() ||
        (email ? email.split("@")[0] : "") ||
        "User";
      const image = image_url || "";

      const user = await User.findByIdAndUpdate(
        id,
        { _id: id, name, email, image },
        { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
      );
      console.log(`Clerk Webhook: User ${id} synced to MongoDB successfully.`);
    } else if (type === "user.deleted") {
      const { id } = data || {};
      if (id) {
        await User.findByIdAndDelete(id);
        console.log(`Clerk Webhook: User ${id} deleted from MongoDB.`);
      }
    }

    return res
      .status(200)
      .json({ success: true, message: "Webhook processed successfully" });
  } catch (error) {
    console.error("Clerk Webhook Error:", error);
    return res
      .status(500)
      .json({ success: false, message: error.message || "Internal Server Error" });
  }
};
