import {Telemetry} from "../models/telemetry.model.js";
import {WatchHistory} from "../models/watchHistory.model.js";
import {ApiError} from "../utils/ApiError.js";
import {ApiResponse} from "../utils/apiResponse.js";
import {asyncHandler} from "../utils/asyncHandler.js";
import geoip from "geoip-lite";

let isRecordingSession = false;
let updatedTime = 0;
let lastGuestTime = 0;

export const createTelemetryBatch = asyncHandler(async (req, res) => {
  let telemetryData;
  const userId = req.user?._id;

  const q = req.query;
  if (!q.docid || !q.cmt) {
    throw new ApiError(400, "Missing required telemetry parameters");
  }

  telemetryData = [
    {
      videoId: q.docid,
      duration: parseFloat(q.len) || 0,
      currentTime: q.cmt || 0,
      state: q.state || "unknown",
      muted: q.muted,
      fullscreen: q.fullscreen === "true",
      autoplay: q.autoplay === "true",
      sessionId: q.cpn,
      anonId: q.anonId,
      userId: userId || null,
      referrer: q.referrer,
      lact: q.lact,
      final: parseInt(q.final) || 0,
      st: q.st,
      et: q.et,
      volume: q.volume,
      timestamp: q.t ? parseInt(q.t) : Date.now(),
      ns: q.ns,
      el: q.el,
      c: q.c,
      cver: q.cver,
    },
  ];

  if (!Array.isArray(telemetryData) || telemetryData.length === 0) {
    throw new ApiError(400, "No telemetry data provided");
  }

  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0] || req.socket.remoteAddress;
  const geo = geoip.lookup(ip);
  const cr = geo?.country || "UNKNOWN";

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
    userId: userId || null,
    referrer: e.referrer,
    cr,
    lact: e.lact,
    final: e.final || 0,
    subscribed: e.subscribed,
    st: e.st,
    et: e.et,
    timestamp: !isNaN(e.timestamp) ? new Date(Number(e.timestamp)) : new Date(),
  }));

  const operations = [];

  for (const tel of telemetryData) {
    const {videoId, currentTime, duration, final, muted, st, et, anonId} = tel;

    let lastRec = null;

    const stList = st?.toString().split(",").map(parseFloat);
    const etList = et?.toString().split(",").map(parseFloat);
    const mutedList = muted ? muted.toString().split(",") : [];
    const allMutedSame =
      mutedList.length > 1 ? mutedList.every((m) => m === mutedList[0]) : true;

    const isLikelySeek =
      final === 0 && stList.length > 1 && etList.length > 1 && allMutedSame;

    const baseCondition = userId
      ? Math.abs(currentTime - (lastRec?.currentTime || 0)) > 10
      : Math.abs(currentTime - (lastGuestTime || 0)) > 10;

    if (userId) {
      lastRec = await WatchHistory.findOne({video: videoId, userId});
    }

    if (
      final === 0 &&
      stList.length < 2 &&
      etList.length < 2 &&
      baseCondition
    ) {
      isRecordingSession = true;
      updatedTime = currentTime;
    }

    if (isLikelySeek) {
      isRecordingSession = true;
      updatedTime = currentTime;
    }

    if (final === 0 && duration && Math.abs(currentTime - duration) < 0.5) {
      isRecordingSession = true;
      updatedTime = 0;
    }

    if ((final === 1 && !isRecordingSession) || final === 0) continue;

    const updateData = {
      currentTime: updatedTime,
      duration,
      lastUpdated: new Date(),
    };

    if (updatedTime === 0 && !lastRec?.hasEnded) {
      updateData.hasEnded = 1;
    }

    if (userId) {
      operations.push({
        updateOne: {
          filter: {video: videoId, userId},
          update: {$set: updateData},
          upsert: true,
        },
      });
    } else {
      res.locals.guestTimestamps = res.locals.guestTimestamps || {};
      res.locals.guestTimestamps[videoId] = updatedTime;
      lastGuestTime = updatedTime;
    }

    if (final === 1) {
      isRecordingSession = false;
      updatedTime = currentTime;
    }
  }

  try {
    if (operations.length > 0) {
      await WatchHistory.bulkWrite(operations, {ordered: false});
    }

    await Telemetry.insertMany(docs, {ordered: false});

    return res.status(201).json(
      new ApiResponse(
        201,
        {
          insertedCount: docs.length,
          guestTimestamps: res.locals.guestTimestamps || null,
        },
        "ok"
      )
    );
  } catch (err) {
    console.error("Telemetry processing error:", err);
    return res.status(400).json({success: false, error: err.message});
  }
});
