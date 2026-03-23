import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const MongoURI = process.env.MONGODB_URI;
    const isMissing = !MongoURI;
    const isPlaceholder = MongoURI === "your_mongodb_connection_string";
    const isInvalidScheme =
      !isMissing &&
      !isPlaceholder &&
      !MongoURI.startsWith("mongodb://") &&
      !MongoURI.startsWith("mongodb+srv://");

    if (isMissing || isPlaceholder || isInvalidScheme) {
      console.warn(
        "⚠️ MongoDB URI is missing/invalid. Starting without database persistence.",
      );
      return false;
    }

    await mongoose.connect(MongoURI);
    console.log("✅ Connection successful to database");
    return true;
  } catch (error) {
    console.warn(
      "⚠️ Database connection unavailable. Running without persistence:",
      error.message,
    );
    return false;
  }
};

export default connectDB;
