import {Telemetry} from "../models/telemetry.model.js";
import {WatchHistory} from "../models/watchHistory.model.js";
import {ApiError} from "../utils/ApiError.js";
import {ApiResponse} from "../utils/apiResponse.js";
import {asyncHandler} from "../utils/asyncHandler.js";

const controlsSeekMap = new Map();

export const createTelemetryBatch = asyncHandler(async (req, res) => {
  const { telemetryData } = req.body;
  if (!Array.isArray(telemetryData) || telemetryData.length === 0) {
    throw new ApiError(400, "No telemetry data provided");
  }

  const docs = telemetryData.map((e) => ({
    video: e.videoId,
    duration: e.duration,
    currentTime: e.currentTime,
    state: e.state,
    muted: e.muted,
    fullscreen: e.fullscreen,
    autoplay: e.autoplay,
    sessionId: e.sessionId,
    anonId: e.anonId,
    userId: e.userId || null,
    lact: e.lact,
    source: e.source,
    final: e.final || 0,
    seeked: e.seeked || 0,
    timestamp: new Date(e.timestamp) || new Date(),
  }));

  const operations = [];

  for (const tel of telemetryData) {
    const { videoId, userId, currentTime, duration, seeked, source, final } = tel;
    if (!userId) continue;

    const key = `${userId}-${videoId}`;

    if (source === "controls" && seeked === 1) {
      controlsSeekMap.set(key, true);
      continue;
    }

    if (final !== 1) continue;

    const hoverAfterSeek = source === "home" && controlsSeekMap.get(key);

    let updatedTime = currentTime;
    if (Math.abs(currentTime - duration) < 0.5) updatedTime = 0;

    const lastRec = await WatchHistory.findOne({ video: videoId, userId });
    const prev = Math.floor(lastRec?.currentTime || 0);
    const curr = Math.floor(currentTime);

    const jumpedForward = seeked === 1 && curr > prev;
    const jumpedBackward = hoverAfterSeek && curr < prev;
    const largerGap = !seeked && Math.abs(curr - prev) >= 10;

    if (!lastRec && curr < 10 && !hoverAfterSeek) continue;

    const updateNow = hoverAfterSeek || jumpedForward || jumpedBackward || largerGap || updatedTime === 0;
    if (!updateNow) continue;

    operations.push({
      updateOne: {
        filter: { video: videoId, userId },
        update: {
          $set: {
            currentTime: updatedTime,
            duration,
            lastUpdated: new Date(),
          },
        },
        upsert: true,
      },
    });

    if (hoverAfterSeek) controlsSeekMap.delete(key);
  }

  if (operations.length > 0) {
    await WatchHistory.bulkWrite(operations, { ordered: false });
  }
  try {
    await Telemetry.insertMany(docs, { ordered: false });
    return res.status(201).json(new ApiResponse(201, { insertedCount: docs.length }, "ok"));
  } catch (err) {
    return res.status(400).json({ success: false, error: err.message });
  }
});
