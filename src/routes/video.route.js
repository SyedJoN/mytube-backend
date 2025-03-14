import { Router } from "express";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { deleteVideo, getAllVideos, getVideoById, publishVideo, togglePublishStatus, updateVideo } from "../controllers/video.controller.js";

const router = Router();

router.route("/all-videos").get(getAllVideos);

router.route("/publish-video").post(verifyJWT, upload.single("videoFile"), publishVideo);

router.route("/:id").get(getVideoById);

router.route("/edit/:id").patch(verifyJWT, updateVideo);

router.route("/delete/:id").delete(verifyJWT, deleteVideo)

router.route("/publish-status/:id").post(verifyJWT, togglePublishStatus)



export default router