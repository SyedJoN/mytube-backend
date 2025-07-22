import { Telemetry } from "../models/telemetry.model.js";
import { WatchHistory } from "../models/watchHistory.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const createTelemetryBatch = asyncHandler(async (req, res) => {
  const { telemetryData } = req.body;
  if (!Array.isArray(telemetryData) || telemetryData.length === 0) {
    throw new ApiError(400, "No telemetry data provided");
  }

  
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
    final: entry.final || 0, 
    timestamp: new Date(entry.timestamp) || new Date(),
  }));

  const operations = [];

  for (const telemetry of telemetryData) {
    const { videoId, userId, currentTime, duration, final } = telemetry;

    
    if (!userId) {
      console.log("Skipping telemetry: no userId");
      continue;
    }

    let updatedCurrentTime = currentTime;

    
    if (Math.abs(currentTime - duration) < 0.5) {
      console.log("Video ended, resetting currentTime to 0");
      updatedCurrentTime = 0;
    }

    const last = await WatchHistory.findOne({ video: videoId, userId });

    
    if (!last && parseFloat(currentTime.toFixed(0)) < 10 && !final) {
      console.log("Skipping telemetry: no previous record and currentTime < 10");
      continue;
    }

  
    if (
      !last ||
      (final !== 1 && Math.abs(parseFloat(currentTime.toFixed(0)) - (parseFloat(last?.currentTime.toFixed(0)) || 0)) >= 10) ||
      updatedCurrentTime === 0 ||
      parseFloat(currentTime.toFixed(0)) < (parseFloat(last?.currentTime.toFixed(0)) || 0) ||
      final === 1
    ) {
      console.log("Updating WatchHistory:", { videoId, userId, updatedCurrentTime, final });
      operations.push({
        updateOne: {
          filter: { video: videoId, userId },
          update: {
            $set: {
              currentTime: updatedCurrentTime,
              duration,
              lastUpdated: new Date(),
            },
          },
          upsert: true,
        },
      });
    }
  }

  if (operations.length > 0) {
    await WatchHistory.bulkWrite(operations, { ordered: false });
  }

  try {
    const telemetry = await Telemetry.insertMany(docs, { ordered: false });
    return res
      .status(201)
      .json(
        new ApiResponse(
          201,
          { insertedCount: telemetry.length },
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