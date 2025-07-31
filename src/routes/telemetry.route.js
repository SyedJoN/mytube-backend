import { Router } from "express";
import { createTelemetryBatch } from "../controllers/telemetry.controller.js";
import {optionalJWT} from "../middlewares/optionalJWT.js"



const router = Router();

router.route("/stats").get(optionalJWT, createTelemetryBatch);


export default router