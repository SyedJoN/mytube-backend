import { Router } from "express";
import { getLikedVideos, getVideoLikes, toggleLike } from "../controllers/like.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/:entity/:id/toggle").patch(verifyJWT, (req, res, next) => {
    const { entity } = req.params;
    if (!["video", "comment", "tweet"].includes(entity)) {
      return res.status(400).json({ error: "Invalid entity type!" });
    }
    toggleLike(entity)(req, res, next);
  });
  
router.route("/videos").get(verifyJWT, getLikedVideos);
router.route("/video/:videoId").get(getVideoLikes);



export default router