import {Telemetry} from "../models/telemetry.model.js";
import {ApiError} from "../utils/ApiError.js";
import {ApiResponse} from "../utils/apiResponse.js";
import {asyncHandler} from "../utils/asyncHandler.js";
import mongoose from "mongoose";
import { addOrUpdateWatchHistory } from "./user.controller.js";
const {isValidObjectId} = mongoose;

export const createTelemetryBatch = asyncHandler(async (req, res) => {
  const {telemetryData} = req.body;

  console.log("telemtery", telemetryData)
  if (!Array.isArray(telemetryData) || telemetryData.length === 0) {
    throw new ApiError(400, "No telemetry data provided");
  }
  const docs = telemetryData.map((entry) => ({
    video: entry.videoId,
    currentTime: entry.currentTime,
    duration: entry.duration,
    state: entry.state,
    muted: entry.muted,
    fullscreen: entry.fullscreen,
    autoplay: entry.autoplay,
    sessionId: entry.sessionId,
    anonId: entry.anonId,
    userId: entry.userId || null,
    lact: entry.lact,
    timestamp: new Date(entry.timestamp) || new Date(),
  }));

  try {
    const telemetry = await Telemetry.insertMany(docs, {ordered: false});

    return res.status(201).json(
      new ApiResponse(
        200,
        {
          insertedCount: telemetry.length,
        },
        "Telemetry batch created successfully!"
      )
    );
  } catch (err) {
    console.error("❌ Telemetry insert error:", err.message);
    return res.status(400).json({
      success: false,
      message: "Telemetry batch insert failed",
      error: err.message,
    });
  }
});
