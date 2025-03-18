import { Router } from "express";
import { getLikedVideos, toggleCommentLike, toggleTweetLike, toggleVideoLike } from "../controllers/like.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/video/:videoId/toggle").patch(verifyJWT, toggleVideoLike);
router.route("/video/:commentId/toggle").patch(verifyJWT, toggleCommentLike);
router.route("/video/:tweetId/toggle").patch(verifyJWT, toggleTweetLike);
router.route("/videos").get(verifyJWT, getLikedVideos);



export default router