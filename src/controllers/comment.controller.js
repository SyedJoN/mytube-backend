import mongoose from "mongoose";
import { Comment } from "../models/comment.model.js";
import { Like } from "../models/like.model.js"; // Import Like model
import { Video } from "../models/video.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/apiResponse.js";

// ✅ Get Comments with Replies and Like Count
const getVideoComments = asyncHandler(async (req, res) => {
  const { videoId } = req.params;

  if (!videoId) {
    throw new ApiError(400, "Video ID is required!");
  }
  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid Video ID format!");
  }

  // ✅ Fetch first-level comments (parentCommentId: null)
  const videoComments = await Comment.find({ video: videoId, parentCommentId: null })
    .sort({ createdAt: -1 })
    .populate("owner", "username avatar") // Fetch owner details
    .lean(); // Convert Mongoose docs to plain objects for easy modification

  // ✅ Fetch replies for each first-level comment
  for (let comment of videoComments) {
    // Fetch replies
    comment.replies = await Comment.find({ parentCommentId: comment._id })
      .populate("owner", "username avatar")
      .lean();

    // ✅ Count likes for each first-level comment
    comment.likesCount = await Like.countDocuments({ comment: comment._id });

    // ✅ Count likes for each reply
    for (let reply of comment.replies) {
      reply.likesCount = await Like.countDocuments({ comment: reply._id });
    }
  }

  return res.status(200).json(new ApiResponse(200, videoComments, "Comments fetched successfully!"));
});



// ✅ Add a Comment or Reply
const addComment = asyncHandler(async (req, res) => {
  const { content, parentCommentId } = req.body;
  const { videoId } = req.params;
  const userId = req.user?._id;

  if (!content) throw new ApiError(400, "Comment content is required!");
  if (!mongoose.Types.ObjectId.isValid(videoId)) throw new ApiError(400, "Invalid Video ID format!");
  if (parentCommentId && !mongoose.Types.ObjectId.isValid(parentCommentId)) throw new ApiError(400, "Invalid Parent Comment ID format!");

  const video = await Video.findById(videoId);
  if (!video) throw new ApiError(404, "Video not found!");

  // Create comment or reply
  const newComment = await Comment.create({
    content,
    owner: userId,
    video: videoId,
    parentCommentId: parentCommentId || null, // Link reply to parent comment
  });

  return res.status(201).json(new ApiResponse(201, newComment, "Comment added successfully!"));
});


// ✅ Update a Comment
const updateComment = asyncHandler(async (req, res) => {
  const { content } = req.body;
  const { commentId } = req.params;
  const userId = req.user?._id;

  if (!content) {
    throw new ApiError(400, "Updated content is required!");
  }
  if (!mongoose.Types.ObjectId.isValid(commentId)) {
    throw new ApiError(400, "Invalid Comment ID format!");
  }

  const updatedComment = await Comment.findOneAndUpdate(
    { _id: commentId, owner: userId }, // Ensure the user owns the comment
    { content, isEdited: true },
    { new: true } // Return the updated document
  ).populate("owner", "username avatar");

  if (!updatedComment) {
    throw new ApiError(403, "Unauthorized to edit this comment or comment not found!");
  }

  return res.status(200).json(new ApiResponse(200, updatedComment, "Comment updated successfully!"));
});


// ✅ Delete a Comment and its Replies
const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const userId = req.user?._id;

  if (!mongoose.Types.ObjectId.isValid(commentId)) {
    throw new ApiError(400, "Invalid Comment ID format!");
  }

  // Delete the main comment
  const deletedComment = await Comment.findOneAndDelete({
    _id: commentId,
    owner: userId,
  });

  if (!deletedComment) {
    throw new ApiError(403, "Unauthorized to delete this comment!");
  }

  // Delete its direct replies
  await Comment.deleteMany({ parentCommentId: commentId });

  return res.status(200).json(new ApiResponse(200, deletedComment, "Comment and its replies deleted successfully!"));
});


export { getVideoComments, addComment, updateComment, deleteComment };
