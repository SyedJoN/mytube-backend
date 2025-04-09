import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { addComment, deleteComment, getVideoComments, updateComment } from "../controllers/comment.controller.js";


const router = Router();

router.route("/get/:videoId").get(getVideoComments);
router.route("/post/:videoId").post(verifyJWT, addComment);
router.route("/update/:videoId/:commentId").patch(verifyJWT, updateComment);
router.route("/delete/:videoId/:commentId").delete(verifyJWT, deleteComment)

export default router