import mongoose from "mongoose";

const connectDB = async () => {
  try {
    if (mongoose.connection.readyState === 1) {
      console.log("Database already connected");
      return;
    }

    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error("MONGODB_URI is not defined in environment variables");
    }

    await mongoose.connect(uri);

    console.log("Database connected");
    console.log("DB Name:", mongoose.connection.name);
  } catch (error) {
    console.error("DB Connection Error:", error);
    throw error;
  }
};

export default connectDB;