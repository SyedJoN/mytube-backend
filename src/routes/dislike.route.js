import { Router } from "express";

import { verifyJWT } from "../middlewares/auth.middleware.js";
import { toggleDislike } from "../controllers/dislike.controller.js";

const router = Router();

router.route("/:entity/:id/toggle").patch(verifyJWT, (req, res, next) => {
  const { entity } = req.params;
  if (!["video", "comment", "tweet"].includes(entity)) {
    return res.status(400).json({ error: "Invalid entity type!" });
  }
  toggleDislike(entity)(req, res, next);
});


export default router