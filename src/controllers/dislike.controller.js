import mongoose from "mongoose";
import {Dislike} from "../models/dislike.model.js";
import {ApiError} from "../utils/ApiError.js";
import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiResponse} from "../utils/apiResponse.js";
import {Video} from "../models/video.model.js";
import {Comment} from "../models/comment.model.js";
import {Like} from "../models/like.model.js";

export const toggleDislike = (entity) =>
  asyncHandler(async (req, res, next) => {
    const {id} = req.params;
    const userId = req.user?._id;

    if (!id) throw new ApiError(400, `${entity} ID is required!`);
    if (!mongoose.Types.ObjectId.isValid(id))
      throw new ApiError(400, `Invalid ${entity} ID format!`);

    const likeQuery = {[entity]: id, likedBy: userId};
    const dislikeQuery = {[entity]: id, dislikedBy: userId};

    let entityExists;

    if (entity === "video") {
      entityExists = await Video.findById(id);
    } else if (entity === "comment") {
      entityExists = await Comment.findById(id);
    } else {
      throw new ApiError(
        400,
        "Invalid entity type! Must be 'video' or 'comment'."
      );
    }

    if (!entityExists) {
      throw new ApiError(404, `${entity} not found!`);
    }

    // Remove existing like if present
    const existingLike = await Like.findOne(likeQuery);
    if (existingLike) {
      await Like.findByIdAndDelete(existingLike._id);
    }

    // Check if the user already disliked the entity
    const existingDislike = await Dislike.findOne(dislikeQuery);
    if (existingDislike) {
      await Dislike.findByIdAndDelete(existingDislike._id);
      const dislikedBy = await Dislike.find({[entity]: id}).distinct("dislikedBy");

      return res
        .status(200)
        .json(
          new ApiResponse(
            200,
            {dislikedBy},
            `${entity} undisliked successfully!`
          )
        );
    }
     

    // Otherwise, add a new dislike
    await Dislike.create(dislikeQuery);
     const dislikedBy = await Dislike.find({[entity]: id}).distinct("dislikedBy");
    return res
      .status(200)
      .json(new ApiResponse(200, {dislikedBy}, `${entity} disliked successfully!`));
  });
