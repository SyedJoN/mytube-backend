import {asyncHandler} from "../utils/asyncHandler.js";
import {Video} from "../models/video.model.js";
import {ApiError} from "../utils/ApiError.js";
import mongoose from "mongoose";
import {Like} from "../models/like.model.js";
import {Dislike} from "../models/dislike.model.js";
import {ApiResponse} from "../utils/apiResponse.js";
import {uploadToSupabase} from "../utils/SupaBase.js";
import {deleteFromSupabase} from "../utils/deleteFromSupabase.js";
import {extractMetadataAndThumbnail} from "../utils/ffmpeg.js";
import * as fs from "fs";
import {generateThumbnailsAndVTT} from "../utils/vttMap.js";
import path from "path";
import {safeUnlink} from "../utils/SafeUnlink.js";

const getAllVideos = asyncHandler(async (req, res) => {
  const {page = 1, limit = 10, query} = req.query;
  const currentUserId = req.user?._id;
  const pipeline = [];

  // Match Published Videos Only
  pipeline.push({
    $match: {
      isPublished: true,
    },
  });

  // Text Search (optional)
  if (query) {
    pipeline.push({
      $match: {
        $or: [
          {title: {$regex: query, $options: "i"}},
          {description: {$regex: query, $options: "i"}},
        ],
      },
    });
  }

  // Sort by createdAt descending
  pipeline.push({
    $sort: {createdAt: -1},
  });

  // Lookup Owner (user)
  pipeline.push({
    $lookup: {
      from: "users",
      localField: "owner",
      foreignField: "_id",
      as: "owner",
    },
  });

  // Flatten owner array first
  pipeline.push({
    $addFields: {
      owner: {
        $cond: {
          if: {$isArray: "$owner"},
          then: {$first: "$owner"},
          else: "$owner",
        },
      },
    },
  });

  // Lookup subscribers for owner
  pipeline.push({
    $lookup: {
      from: "subscriptions",
      localField: "owner._id",
      foreignField: "channel",
      as: "subscribers",
    },
  });
  // Add subscribersCount & isSubscribedTo field
  pipeline.push({
    $addFields: {
      "owner.subscribersCount": {
        $size: "$subscribers",
      },
      "owner.isSubscribedTo": currentUserId
        ? { $in: [currentUserId, "$subscribers.subscriber"] }
        : false,
    },
  });
  // Project only required fields
  pipeline.push({
    $project: {
      title: 1,
      description: 1,
      thumbnail: 1,
      sprite: 1,
      videoFile: 1,
      views: 1,
      duration: 1,
      createdAt: 1,
      owner: {
        _id: 1,
        username: 1,
        fullName: 1,
        avatar: 1,
        coverImage: 1,
        subscribersCount: 1,
        isSubscribedTo: 1,
      },
    },
  });

  // Pagination
  const pageNumber = parseInt(page, 10);
  const limitNumber = parseInt(limit, 10);
  const options = {
    page: pageNumber,
    limit: limitNumber,
    offset: (pageNumber - 1) * limitNumber,
  };

  const videoAggregate = Video.aggregate(pipeline);
  const video = await Video.aggregatePaginate(videoAggregate, options);

  return res
    .status(200)
    .json(new ApiResponse(200, video, "All videos fetched successfully"));
});

const publishVideo = asyncHandler(async (req, res) => {
  const {title, description} = req.body;

  if (!title || !description) {
    throw new ApiError(400, "Title and description are required.");
  }

  const existingVideo = await Video.findOne({title});
  if (existingVideo) {
    throw new ApiError(400, "Video with the same title already exists.");
  }

  const videoLocalPath = req.file?.path;
  if (!videoLocalPath) {
    throw new ApiError(400, "Video file is required.");
  }

  const {spritePath, vttPath} = await generateThumbnailsAndVTT(videoLocalPath, {
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseBucket: "video-sprites",
  });

  const {
    duration,
    thumbnailPath,
    previewPath,
    activeColor,
    primaryColor,
    secondaryColor,
  } = await extractMetadataAndThumbnail(videoLocalPath);

  const safeUpload = async (filePath, bucket) => {
    try {
      const result = await uploadToSupabase(filePath, bucket);
      if (!result) throw new Error("Upload returned null.");
      return result;
    } catch (err) {
      console.error(`Upload failed [${bucket}] →`, filePath);
      console.error("Reason:", err.message);
      return null;
    }
  };

  const uploadedVideo = await safeUpload(videoLocalPath, "videos");
  const uploadedPreview = await safeUpload(previewPath, "thumbnails");
  const uploadedThumbnail = await safeUpload(thumbnailPath, "thumbnails");

  if (!uploadedVideo || !uploadedPreview || !uploadedThumbnail) {
    [uploadedVideo, uploadedPreview, uploadedThumbnail].forEach(safeUnlink);
    throw new ApiError(500, "One or more uploads to Supabase failed.");
  }

  const newVideo = await Video.create({
    videoFile: {
      url: uploadedVideo.url,
      fileId: uploadedVideo.fileId,
    },
    thumbnail: {
      url: uploadedThumbnail?.url ?? "",
      fileId: uploadedThumbnail?.fileId ?? "",
      preview: uploadedPreview?.url ?? "",
      activeColor,
      primaryColor,
      secondaryColor,
    },
    sprite: {
      url: spritePath,
      vtt: vttPath,
    },
    owner: req.user._id,
    title,
    description,
    duration: duration || 0,
    isPublished: true,
  });

  const localPaths = [
    videoLocalPath,
    previewPath,
    thumbnailPath,
    spritePath,
    vttPath,
  ];
  for (const file of localPaths) {
    safeUnlink(file);
  }

  return res
    .status(200)
    .json(new ApiResponse(200, newVideo, "Video uploaded successfully."));
});

const getVideoById = asyncHandler(async (req, res) => {
  const {videoId} = req.params;

  if (!videoId) {
    throw new ApiError(400, "ID is required!");
  }
  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid video ID format!");
  }

  const video = await Video.findById(videoId).populate(
    "owner",
    "-refreshToken -watchHistory -password -createdAt -updatedAt -coverImage -email"
  );

  if (!video) {
    throw new ApiError(404, "Video not found!");
  }

  const likesCount = await Like.countDocuments({video: videoId});
  const likedBy = await Like.find({video: videoId}).select("likedBy");
  const dislikedBy = await Dislike.find({video: videoId}).select("dislikedBy");

  const videoWithLikes = video.toObject();

  videoWithLikes.likesCount = likesCount;
  videoWithLikes.likedBy = likedBy.map((like) => like.likedBy);
  videoWithLikes.disLikedBy = dislikedBy.map((dislike) => dislike.dislikedBy);

  return res
    .status(200)
    .json(new ApiResponse(200, videoWithLikes, "Video fetched successfully!"));
});
const updateVideo = asyncHandler(
  asyncHandler(async (req, res) => {
    const {videoId} = req.params;
    const {title, description} = req.body;

    if (!videoId) {
      throw new ApiError("400", "ID is required!");
    }
    if (!mongoose.Types.ObjectId.isValid(videoId)) {
      throw new ApiError(400, "Invalid ID Format!");
    }

    const video = await Video.findByIdAndUpdate(
      videoId,
      {
        $set: {
          title,
          description,
        },
      },
      {
        new: true,
      }
    ).select("-owner");

    if (!video) {
      throw (new ApiError(404), "Video not found!");
    }

    return res
      .status(200)
      .json(new ApiResponse(200, video, "Video updated successfully!"));
  })
);
const deleteVideo = asyncHandler(async (req, res) => {
  const {videoId} = req.params;

  if (!videoId) {
    throw new ApiError("400", "ID is required!");
  }

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid ID Format!");
  }
  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(505, "Video not found!");
  }

  deleteFromSupabase(video.videoFile.fileId);

  const deletedVideo = await Video.findByIdAndDelete(videoId);

  return res
    .status(200)
    .json(new ApiResponse(200, deletedVideo, "Video deleted successfully!"));
});

const togglePublishStatus = asyncHandler(async (req, res) => {
  const {videoId} = req.params;

  if (!videoId) {
    throw new ApiError("400", "ID is required!");
  }

  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid ID Format!");
  }

  const videoStatus = await Video.findByIdAndUpdate(
    videoId,
    [
      {
        $set: {
          isPublished: {$not: "$isPublished"},
        },
      },
    ],
    {new: true}
  );

  if (!videoStatus) {
    throw new ApiError(404, "Video not found!");
  }
  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        videoStatus,
        `Video is ${videoStatus.isPublished === true ? "published" : "unpublished"} successfully!`
      )
    );
});

const incrementViews = asyncHandler(async (req, res) => {
  const {videoId} = req.params;

  if (!videoId) throw new ApiError(400, "ID is required!");
  if (!mongoose.Types.ObjectId.isValid(videoId))
    throw new ApiError(400, "Invalid video ID format!");

  const video = await Video.findByIdAndUpdate(
    videoId,
    {$inc: {views: 1}},
    {new: true}
  );

  if (!video) throw new ApiError(404, "Video not found!");

  return res
    .status(200)
    .json(new ApiResponse(200, video.views, "View count updated!"));
});

export {
  getAllVideos,
  publishVideo,
  getVideoById,
  updateVideo,
  deleteVideo,
  togglePublishStatus,
  incrementViews,
};
