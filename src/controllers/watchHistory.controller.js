import { WatchHistory } from "../models/watchHistory.model.js";
import { ApiResponse } from "../utils/apiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const getWatchHistory = asyncHandler(async (req, res) => {
  const userId = req.user?._id;

  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const history = await WatchHistory.find({ userId })
    .sort({ lastUpdated: -1 })
    .populate({
      path: "video",
      select: "title thumbnail duration", // select fields you need
    });

  return res.status(200).json(
    new ApiResponse(200, history, "Watch history fetched successfully")
  );
});
