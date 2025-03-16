import mongoose, {isValidObjectId} from "mongoose";
import {Tweet} from "../models/tweet.model.js";
import {User} from "../models/user.model.js";
import {ApiError} from "../utils/ApiError.js";
import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiResponse} from "../utils/apiResponse.js";

const createTweet = asyncHandler(async (req, res) => {
  const {content} = req.body;
  const userId = req.user?._id;

  if (!content) {
    throw new ApiError(400, "Tweet must not be empty!");
  }

  const tweet = await Tweet.create({
    content,
    owner: userId,
  });

  if (!tweet) {
    throw new ApiError(500, "Something went wrong while creating a tweet.");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, tweet, "Tweet created successfully!"));
});

const getUserTweets = asyncHandler(async (req, res) => {
  const {userId} = req.params;

  if (!userId) {
    throw new ApiError(400, "User id is required!");
  }
  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError(400, "Invalid id format!");
  }

  const userTweets = await Tweet.find({owner: userId});

  if (!userTweets) {
    throw new ApiError(500, "Something went wrong while fetching user tweets");
  }
  return res
    .status(200)
    .json(
      new ApiResponse(200, userTweets, "User tweets fetched successfully!")
    );
});

const updateTweet = asyncHandler(async (req, res) => {
  const {tweetId} = req.params;
  const {content} = req.body;
  const userId = req.user?._id;

  if (!tweetId) {
    throw new ApiError(400, "User id is required!");
  }
  if (!mongoose.Types.ObjectId.isValid(tweetId)) {
    throw new ApiError(400, "Invalid id format!");
  }

  if (!content) {
    throw new ApiError(400, "Content field must not be empty!");
  }

  const updatedTweet = await Tweet.findOneAndUpdate(
    {
      _id: tweetId,
      owner: userId,
    },
    {
      $set: {
        content,
      },
    },
    {new: true}
  );

  if (!updatedTweet) {
    throw new ApiError(500, "Error while updating the tweet");
  }
  return res
  .status(200)
  .json(
    new ApiResponse(
        200,
        updatedTweet,
        "Tweet updated successfully!"
    )
  )
});

const deleteTweet = asyncHandler(async (req, res) => {
  const {tweetId} = req.params;
  const userId = req.user?._id;

  if (!tweetId) {
    throw new ApiError(400, "User id is required!");
  }
  if (!mongoose.Types.ObjectId.isValid(tweetId)) {
    throw new ApiError(400, "Invalid id format!");
  }

  const deletedTweet = await Tweet.findOneAndDelete({
    _id: tweetId,
    owner: userId,
  });

  if (!deletedTweet) {
    throw new ApiError(500, "Something went wrong while deleting the tweet.");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, deletedTweet, "Tweet deleted successfully!"));
});

export {createTweet, getUserTweets, updateTweet, deleteTweet};
