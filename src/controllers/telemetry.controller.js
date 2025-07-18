
import { Telemetry } from "../models/telemetry.model.js";
import {ApiError} from "../utils/ApiError.js";
import {ApiResponse} from "../utils/apiResponse.js";
import {asyncHandler} from "../utils/asyncHandler.js";

export const createTelemetry = asyncHandler(async (req, res) => {
  const {
    videoId,
    currentTime,
    duration,
    state,
    muted,
    fullscreen,
    autoplay,
    sessionId,
    anonId,
    userId,
    lact,
    timestamp,
  } = req.body;

  const telemetry = await Telemetry.create({
    video: videoId,
    currentTime,
    duration,
    state,
    muted,
    fullscreen,
    autoplay,
    sessionId,
    anonId,
    user: userId || null,
    lact,
    timestamp: timestamp || new Date(),
  });
  if (!telemetry) {
    throw new ApiError(500, "Something when wrong while creating telemetry");
  }
  return res
    .status(201)
    .json(new ApiResponse(200, "Telemetry created successfully!"));
});
