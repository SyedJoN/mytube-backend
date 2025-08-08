import mongoose from "mongoose";
import {Schema} from "mongoose";

const telemetrySchema = new Schema(
  {
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
    referrer: String,
    lact: Number,
    final: Number,
    subscribed: Number,
    cr: String,
    st: Array,
    et: Array,
    timestamp: {type: Date, default: Date.now, index: {expires: "10d"}},
  },
  {timestamps: true}
);

export const Telemetry = mongoose.model("WatchTelemetry", telemetrySchema);
