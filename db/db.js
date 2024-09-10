import mongoose from "mongoose";

const DB_NAME = "UserAuth";

const connectDB = async () => {
    try {
        const connection = await mongoose.connect(process.env.MONGODB_URI, {
            dbName: DB_NAME,
        });
        console.log(`\n MongoDB connected !! DB HOST: ${connection.connection.host}`);
    } catch (error) {
        console.log("MONGODB connection error", error);
        process.exit(1);
    }
};

export default connectDB;