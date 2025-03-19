import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { deleteVideo, getAllVideos, getVideoById, incrementViews, publishVideo, togglePublishStatus, updateVideo } from "../controllers/video.controller.js";

const router = Router();

router.route("/all-videos").get(getAllVideos);

router.route("/publish-video").post(verifyJWT, upload.single("videoFile"), publishVideo);

router.route("/:videoId").get(getVideoById);

router.route("/edit/:videoId").patch(verifyJWT, updateVideo);

router.route("/delete/:videoId").delete(verifyJWT, deleteVideo)

router.route("/:videoId/publish-status/").patch(verifyJWT, togglePublishStatus)

router.route("/:videoId/watch").post(incrementViews)



export default router