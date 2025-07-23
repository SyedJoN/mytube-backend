import mongoose from "mongoose";
import {Schema} from "mongoose";


const telemetrySchema = new Schema({
  sessionId: String,
  anonId: String,
  userId: {type: Schema.Types.ObjectId, ref: "User", default: null},
  video: {type: Schema.Types.ObjectId, ref: "Video"},
  currentTime: Number,
  duration: Number,
  state: String,
  muted: Boolean,
  fullscreen: Boolean,
  autoplay: Boolean,
  lact: Number,
  final: Number,
  seeked: Number,
  source: String,
  timestamp: {type: Date, default: Date.now, index: {expires: "10d"}},
}, {timestamps: true});

export const Telemetry = mongoose.model("WatchTelemetry", telemetrySchema);
