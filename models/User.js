import mongoose, { Schema } from "mongoose";
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs'; // Corrected import
import crypto from "crypto";
const UserSchema = new Schema({
    name: {
        type: String
    },
    email: {
        type: String,
        unique: true
    },
    password: {
        type: String
    },
    resetPasswordToken: { type: String }, // Add this field
    resetPasswordExpires: { type: Date } // Add this field
}, { timestamps: true });

UserSchema.pre("save", async function (next) {
    if (!this.isModified("password")) return next();

    // Hash the password with a salt round of 10
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

UserSchema.methods.isPasswordCorrect = async function (password) {
    return await bcrypt.compare(password, this.password);
};

UserSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        {
            _id: this._id,
            name: this.name,
            email: this.email,
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    );
};

UserSchema.methods.generatePasswordReset = function () {
    this.resetPasswordToken = crypto.randomBytes(20).toString('hex');
    this.resetPasswordExpires = Date.now() + 3600000; // 1 hour
};

export const User = mongoose.model("User", UserSchema);
