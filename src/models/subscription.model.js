import mongoose, {Schema} from "mongoose";

const subscriptionSchema = new Schema(
  {
    subscriber: {
      type: mongoose.Types.ObjectId, // one who is subscribing
      ref: "User",
    },
    channel: {
      type: mongoose.Types.ObjectId, // one to whome 'subscriber' is subscribing
      ref: "User",
    },
  },
  {timestamps: true}
);

export const Subscription = mongoose.model("Subscription", subscriptionSchema);
