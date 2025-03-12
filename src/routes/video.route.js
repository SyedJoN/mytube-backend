import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { publishVideo } from "../controllers/video.controller.js";

const router = Router();

router.route("/publish-video").post(verifyJWT, upload.single("videoFile"), publishVideo);



export default router