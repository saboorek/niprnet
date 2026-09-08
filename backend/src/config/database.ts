import mongoose from "mongoose";

export const connectDatabase = async () => {
    try {
        const mongoUrl = process.env.MONGO_URL;

        if (!mongoUrl) {
            throw new Error('MONGO_URL is not defined in environment variables');
        }

        await mongoose.connect(mongoUrl);
        console.log('✅ Connected to MongoDB');
    } catch (err) {
        console.error('❌ MongoDB connection error:', err);
        throw err;
    }
};