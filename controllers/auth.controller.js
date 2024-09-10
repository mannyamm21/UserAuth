import { User } from "../models/User.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import nodemailer from "nodemailer";
import { google } from "googleapis";
import { OAuth2Client } from "google-auth-library";
import dotenv from 'dotenv';
dotenv.config();


const generateAccessToken = async (userId) => {
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        await user.save({ validateBeforeSave: false })

        return { accessToken }
    } catch (error) {
        throw new ApiError(500, "Someting went wrong while generating referesh and access token")
    }
}

const registerUser = asyncHandler(async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (([name, email, password].some((field) => field?.trim() === ""))) {
            throw new ApiError(400, "All fields are required")
        }

        const exist = await User.findOne({ email });
        if (exist) {
            throw new ApiError(409, "User already exists")
        }

        // create user in database
        const user = await User.create({
            name, email, password
        })
        if (!user) {
            throw new ApiError(500, "Something went wrong while registering the user");
        }
        const createUser = await User.findById(user._id).select("-password")

        if (!createUser) {
            throw new ApiError(500, "Something went wrong while registering the user")
        }

        return res.status(201).json(
            new ApiResponse(200, createUser, "User registered Successfully")
        )
    } catch (error) {
        console.log(error)
    }
})

const loginUser = asyncHandler(async (req, res) => {
    try {
        const { email, password } = req.body;

        //check if the user exists
        const user = await User.findOne({ email });
        if (!user) {
            throw new ApiError(404, "User does not exist")
        }

        const isPasswordValid = await user.isPasswordCorrect(password)
        if (!isPasswordValid) {
            throw new ApiError(404, "Password is incorrect")
        }

        const { accessToken, refreshToken } = await generateAccessToken(user._id)
        const loggedInUser = await User.findById(user._id).select("-password")

        const options = {
            httpOnly: true,
            secure: true,
            sameSite: "None"
        }

        return res.status(200)
            .cookie("accessToken", accessToken, options)
            .json(
                new ApiResponse(200, {
                    user: loggedInUser, accessToken,
                    refreshToken
                }, "User logged in Successfully")
            )

    } catch (error) {
        console.log(error)
    }
})

const getProfile = asyncHandler(async (req, res) => {
    return res
        .status(200)
        .json(new ApiResponse(
            200,
            req.user,
            "User fetched successfully"
        ))
});

const { OAuth2 } = google.auth;
const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    "https://developers.google.com/oauthplayground" // Redirect URL for the OAuth2 flow
);

oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});



console.log("Setting OAuth2 client credentials:", {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
});

const getAccessToken = async () => {
    try {
        const tokenResponse = await oauth2Client.getAccessToken();
        console.log("Access token retrieved successfully:", tokenResponse);
        return tokenResponse.token;
    } catch (err) {
        console.error("Error getting access token:", err);
        throw new ApiError(500, "Failed to create access token");
    }
};

const createTransporter = async () => {
    const accessToken = await getAccessToken();
    if (!accessToken) {
        throw new ApiError(500, "Failed to retrieve access token");
    }
    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            type: 'OAuth2',
            user: process.env.EMAIL_USERNAME,
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            refreshToken: process.env.GOOGLE_REFRESH_TOKEN,
            accessToken,
        },
    });
};

const forgotPassword = asyncHandler(async (req, res) => {
    const { email } = req.body;

    if (!email) {
        throw new ApiError(400, "Email is required");
    }

    const user = await User.findOne({ email });

    if (!user) {
        throw new ApiError(404, "No user found with that email address");
    }

    user.generatePasswordReset();
    console.log(user)
    await user.save();

    const resetURL = `http://localhost:8000/reset-password/${user.resetPasswordToken}`;

    const transporter = await createTransporter();
    const mailOptions = {
        to: user.email,
        from: {
            name: "UserAuth",
            address: process.env.EMAIL_USERNAME,
        },
        subject: 'Password Reset',
        text: `You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n` +
            `${resetURL}\n\n`
    };

    transporter.sendMail(mailOptions, (err) => {
        if (err) {
            console.error("Error sending email:", err);
            throw new ApiError(500, "Error sending the email");
        }
        res.status(200).json(new ApiResponse(200, {}, "Password reset email sent successfully"));
    });
});


const resetPassword = asyncHandler(async (req, res) => {
    const { token, password } = req.body;
    console.log(token);
    console.log(password)
    if (!token || !password) {
        throw new ApiError(400, "Token and new password are required");
    }

    const user = await User.findOne({
        resetPasswordToken: token,
        resetPasswordExpires: { $gt: Date.now() }
    });
    console.log(user)
    if (!user) {
        throw new ApiError(400, "Password reset token is invalid or has expired");
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json(new ApiResponse(200, {}, "Password has been reset"));
});


export { registerUser, loginUser, getProfile, forgotPassword, resetPassword }