import mongoose, {mongo} from "mongoose";
import {Comment} from "../models/comment.model.js";
import {ApiError} from "../utils/ApiError.js";
import {asyncHandler} from "../utils/asyncHandler.js";
import {Video} from "../models/video.model.js";
import {ApiResponse} from "../utils/apiResponse.js";

const getVideoComments = asyncHandler(async (req, res) => {
  const {videoId} = req.params;
  const {page = 1, limit = 10} = req.query;

  if (!videoId) {
    throw new ApiError(400, "id is required!");
  }
  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Incorrect id format!");
  }

  const pageNumber = parseInt(page, 10);
  const limitNumber = parseInt(limit, 10);
  const skip = (pageNumber - 1) * limitNumber;

  const videoComments = await Comment.find({
    video: videoId,
  })
    .sort({createdAt: -1})
    .skip(skip)
    .limit(limitNumber)
    .populate("owner", "username avatar");

    if (!videoComments) {
      throw new ApiError(500, "Error while fetching comments")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            videoComments,
            "Video comments fetched successfully!"
        )
    )


});


const addComment = asyncHandler(async (req, res) => {
  const {content} = req.body;
  const {videoId} = req.params;
  const userId = req.user?._id;

  if (!content) {
    throw new ApiError("comment is required!");
  }

  if (!videoId) {
    throw new ApiError(400, "id is required!");
  }
  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Incorrect id format!");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found!");
  }

  const commentOnVideo = await Comment.create({
    content,
    owner: userId,
    video: videoId,
  });
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        commentOnVideo,
        "Comment on video added successfully!"
      )
    );
});

const updateComment = asyncHandler(async (req, res) => {
  const {content} = req.body;
  const {videoId, commentId} = req.params;
  const userId = req.user?._id;

  if (!content) {
    throw new ApiError("comment is required!");
  }

  if (!commentId || !videoId) {
    throw new ApiError(400, "id is required!");
  }
  if (!mongoose.Types.ObjectId.isValid(commentId) || !mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Incorrect id format!");
  }

 
  const editedComment = await Comment.findOneAndUpdate(
    {
      video: videoId,
      owner: userId,
    },
    {
      $set: {
        content: content,
      },
    },
    {
      new: true,
    }
  );

  if (!editedComment) {
    throw new ApiError(400, "Unauthorized request!");

  }

  return res
    .status(200)
    .json(new ApiResponse(200, editedComment, "Comment updated successfully!"));
});

const deleteComment = asyncHandler(async (req, res) => {
  const {videoId, commentId} = req.params;
  const userId = req.user?._id;

  if (!videoId || !commentId) {
    throw new ApiError(400, "id is required!");
  }
  if (
    !mongoose.Types.ObjectId.isValid(videoId) ||
    !mongoose.Types.ObjectId.isValid(commentId)
  ) {
    throw new ApiError(400, "Incorrect id format!");
  }

  const deletedComment = await Comment.findOneAndDelete({
    _id: commentId,
    owner: userId,
  });

  if (!deletedComment) {
    throw new ApiError(400, "Unauthorized request!");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, deletedComment, "Comment deleted successfully!")
    );
});

export {getVideoComments, addComment, updateComment, deleteComment};
