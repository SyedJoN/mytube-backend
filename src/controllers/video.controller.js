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

const getAllVideos = asyncHandler(async (req, res) => {
  // sari queries extract kro userId k sath
  // queries me page aur limit ko convert kro number me
  // sirf published videos ko dikhao
  // query ki basis py pipeline bnao
  // agr specific user ki videos dekhna hai to usko check kro

  const {page = 1, limit = 10, query, sortBy, sortType} = req.query;

  const pipeline = [];

  pipeline.push({
    $match: {
      isPublished: true,
    },
  });

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

  // if (query) {
  //   pipeline.push({
  //     $search: {
  //       index: "search-videos",
  //       text: {
  //         query: query,
  //         path: ["title", "description"],
  //       },
  //     },
  //   });
  // }

  // if (userId && mongoose.Types.ObjectId.isValid(userId)) {
  //   pipeline.push({
  //     $match: {
  //       owner: new mongoose.Types.ObjectId(userId),
  //     },
  //   });
  // }

  //   if (sortBy && sortType) {
  //     pipeline.push({
  //       $sort: {
  //         [sortBy]: sortType === "asc" ? 1 : -1,
  //       },
  //     });
  //   } else {
  //     pipeline.push({
  //       $sort: {createdAt: -1},
  //     });
  //   }             ismein masla yeh k yeh backend sy filtering hogi har dafa database req send hogi

  pipeline.push({
    $sort: {
      createdAt: -1,
    },
  });

  pipeline.push({
    $lookup: {
      from: "users",
      localField: "owner",
      foreignField: "_id",
      as: "owner",
      pipeline: [
        {
          $project: {
            fullName: 1,
            username: 1,
            avatar: 1,
          },
        },
      ],
    },
  });

  pipeline.push({
    $addFields: {
      owner: {
        $first: "$owner",
      },
    },
  });

  pipeline.push({
    $project: {
      title: 1,
      description: 1,
      thumbnail: 1,
      views: 1,
      duration: 1,
      owner: 1,
      createdAt: 1,
    },
  });

  const pageNumber = parseInt(page, 10);
  const limitNumber = parseInt(limit, 10);

  const options = {
    page: pageNumber,
    limit: limitNumber,
    offset: (pageNumber - 1) * limitNumber, // Corrected pagination logic
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
    throw new ApiError(400, "All fields are required!");
  }

  const existingVideo = await Video.findOne({
    $or: [{title}],
  });

  if (existingVideo) {
    throw new ApiError(400, "Video with the same title already exists!");
  }

  let videoLocalPath;
  if (req.file) {
    videoLocalPath = req.file.path;
  }

  if (!videoLocalPath) {
    throw new ApiError(400, "Video file is required!");
  }
  const {duration, thumbnailPath, dominantColorHex, darkHoverColorHex, lightTextColorHex} =
    await extractMetadataAndThumbnail(videoLocalPath);
    
  const uploadedVideo = await uploadToSupabase(videoLocalPath, "videos");

  if (!uploadedVideo) {
    throw new ApiError(400, "Something went wrong while uploading on Supabase");
  }

  const uploadedThumbnail = await uploadToSupabase(thumbnailPath, "thumbnails");

  const video = await Video.create({
    videoFile: {
      url: uploadedVideo.url,
      fileId: uploadedVideo.fileId,
    },
    thumbnail: {
      url: uploadedThumbnail.url || "",
      fileId: uploadedThumbnail.fileId,
      dominantColor: dominantColorHex,
      darkHoverColor: darkHoverColorHex,
      lightTextColor: lightTextColorHex
    },
    owner: req.user?._id,
    title,
    description,
    duration: duration || 0,
    isPublished: true,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video uploaded successfully!"));
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
