import mongoose from "mongoose";
import {Like} from "../models/like.model.js";
import {ApiError} from "../utils/ApiError.js";
import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiResponse} from "../utils/apiResponse.js";

const toggleVideoLike = asyncHandler(async (req, res) => {
  const {videoId} = req.params;
  const userId = req.user?._id;

  if (!videoId) {
    throw new ApiError(400, "id is required!");
  }
  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid id format!");
  }

  const existingLike = await Like.findOne({video: videoId, likedBy: userId});
  if (existingLike) {
    await Like.findByIdAndDelete(existingLike._id);
  } else {
    await Like.create({
      video: videoId,
      likedBy: userId,
    });
  }
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {},
        `Video ${existingLike ? "unliked" : "liked"} successfully!`
      )
    );
});

const toggleCommentLike = asyncHandler(async (req, res) => {
  const {commentId} = req.params;
  const userId = req.user?._id;

  if (!commentId) {
    throw new ApiError(400, "id is required!");
  }
  if (!mongoose.Types.ObjectId.isValid(commentId)) {
    throw new ApiError(400, "Invalid id format!");
  }

  const existingLike = await Like.findOne({
    comment: commentId,
    likedBy: userId,
  });
  if (existingLike) {
    await Like.findByIdAndDelete(existingLike._id);
  } else {
    await Like.create({
      comment: commentId,
      likedBy: userId,
    });
  }
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {},
        `Comment ${existingLike ? "unliked" : "liked"} successfully!`
      )
    );
});

const toggleTweetLike = asyncHandler(async (req, res) => {
  const {tweetId} = req.params;
  const userId = req.user?._id;

  if (!tweetId) {
    throw new ApiError(400, "id is required!");
  }
  if (!mongoose.Types.ObjectId.isValid(tweetId)) {
    throw new ApiError(400, "Invalid id format!");
  }

  const existingLike = await Like.findOne({tweet: tweetId, likedBy: userId});
  if (existingLike) {
    await Like.findByIdAndDelete(existingLike._id);
  } else {
    await Like.create({
      tweet: tweetId,
      likedBy: userId,
    });
  }
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        {},
        `Tweet ${existingLike ? "unliked" : "liked"} successfully!`
      )
    );
});

const getLikedVideos = asyncHandler(async (req, res) => {
  const userId = req.user?._id;

  const likedVideos = await Like.find({likedBy: userId})
    .populate({
      path: "video",
      select: "-_id -createdAt -updatedAt -isPublished", // Select fields from the Video model
    })
    .select("-createdAt -updatedAt");

  if (!likedVideos) {
    throw new ApiError(400, "liked videos not found!");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, likedVideos, "Liked videos fetched successfully!")
    );
});
const getVideoLikes = asyncHandler(async (req, res) => {
  const {videoId} = req.params;

  const videoLikes = await Like.countDocuments({video: videoId});

  return res
    .status(200)
    .json(
      new ApiResponse(200, videoLikes, "Video likes fetched successfully!")
    );
});
export {toggleCommentLike, toggleTweetLike, toggleVideoLike, getLikedVideos, getVideoLikes};
