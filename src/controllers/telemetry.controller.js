import {Telemetry} from "../models/telemetry.model.js";
import {WatchHistory} from "../models/watchHistory.model.js";
import {ApiError} from "../utils/ApiError.js";
import {ApiResponse} from "../utils/apiResponse.js";
import {asyncHandler} from "../utils/asyncHandler.js";
import mongoose from "mongoose";

export const createTelemetryBatch = asyncHandler(async (req, res) => {
  const {telemetryData} = req.body;
  if (!Array.isArray(telemetryData) || telemetryData.length === 0) {
    throw new ApiError(400, "No telemetry data provided");
  }

  // Prepare telemetry docs for insertion
  const docs = telemetryData.map((entry) => ({
    video: entry.videoId,
    duration: entry.duration,
    currentTime: entry.currentTime,
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

  // Handle Watch History update (only if userId exists)
  for (const telemetry of telemetryData) {
    const {videoId, userId, currentTime, duration} = telemetry;

    // Skip anonymous or too early watch time
    if (!userId || Math.ceil(currentTime).toFixed(0) < 10) continue;

    const last = await WatchHistory.findOne({video: videoId, userId});

    if (!last) {
      // Insert if doesn't exist
      await WatchHistory.updateOne(
        {video: videoId, userId},
        {
          $set: {
            currentTime,
            duration,
            lastUpdated: new Date(),
          },
        },
        {upsert: true}
      );
    } else if (
      Math.floor(currentTime) - (Math.floor(last.currentTime) || 0) >=
      10
    ) {
      // Update only if 10s progress since last update
      await WatchHistory.updateOne(
        {video: videoId, userId},
        {
          $set: {
            currentTime,
            duration,
            lastUpdated: new Date(),
          },
        },
        {upsert: true}
      );
    }
  }

  // Insert telemetry logs
  try {
    const telemetry = await Telemetry.insertMany(docs, {ordered: false});

    return res
      .status(201)
      .json(
        new ApiResponse(
          201,
          {insertedCount: telemetry.length},
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
