import mongoose from "mongoose";
import {Schema} from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

const watchHistorySchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  video: { type: Schema.Types.ObjectId, ref: "Video", required: true },
  currentTime: { type: Number, default: 0 },
  duration: { type: Number, default: 0 },
  lastUpdated: { type: Date, default: Date.now },
});

watchHistorySchema.plugin(mongooseAggregatePaginate);

export const WatchHistory = mongoose.model("WatchHistory", watchHistorySchema);