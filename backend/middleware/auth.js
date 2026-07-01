import { clerkClient, getAuth } from "@clerk/express";

export const protectAdmin = async (req, res, next) => {
  try {
    const { userId } = getAuth(req);

    // console.log("USER ID:", userId);

    const user = await clerkClient.users.getUser(userId);

    // console.log("PRIVATE METADATA:", user.privateMetadata);
    // console.log("ROLE:", user.privateMetadata.role);

    if (user.privateMetadata.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied",
      });
    }

    next();
  } catch (error) {
    console.log(error);
  }
};