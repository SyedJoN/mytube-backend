import mongoose, {Schema} from "mongoose";

const dislikeSchema = new Schema(
  {
    dislikedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    video: {
      type: Schema.Types.ObjectId,
      ref: "Video",
    },
    tweet: {
      type: Schema.Types.ObjectId,
      ref: "Tweet",
    },
    comment: {
          type: Schema.Types.ObjectId,
            ref: "Comment"
    }
  },
  {timestamps: true}
);


export const Dislike = mongoose.model("Dislike", dislikeSchema);
