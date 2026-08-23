import mongoose from "mongoose";

// Serverless functions (Vercel) can run the same module multiple times
// across invocations, so we cache the connection on `global` to avoid
// opening a new MongoDB connection on every single request.
let cached = global._mongooseConn;
if (!cached) {
  cached = global._mongooseConn = { conn: null, promise: null };
}

const connectDB = async () => {
  if (cached.conn) return cached.conn;

  const uri = process.env.MONGO_URI;
  if (!uri) {
    throw new Error("MONGO_URI is not set");
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(uri).then((m) => {
      console.log(`MongoDB connected: ${m.connection.host}`);
      return m;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null; // allow retry on next invocation instead of staying broken
    throw err;
  }

  return cached.conn;
};

export default connectDB;
