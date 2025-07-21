import { Router } from "express";
import { createTelemetryBatch } from "../controllers/telemetry.controller.js";



const router = Router();

router.route("/stats").post(createTelemetryBatch);


export default router