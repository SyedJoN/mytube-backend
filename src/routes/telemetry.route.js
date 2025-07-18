import { Router } from "express";
import { createTelemetry } from "../controllers/telemetry.controller.js";


const router = Router();

router.route("/telemetry").post(createTelemetry);


export default router