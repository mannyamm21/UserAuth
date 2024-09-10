import { Router } from "express";
import { registerUser, loginUser, getProfile, forgotPassword, resetPassword } from "../controllers/auth.controller.js"
import { verifyJWT } from '../middleware/jwt.auth.js'


const router = Router()

router.route("/register").post(registerUser)
router.route("/login").post(loginUser)
router.route("/profile").get(verifyJWT, getProfile)
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

export default router