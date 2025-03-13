import {asyncHandler} from "../utils/asyncHandler.js";
import {Video} from "../models/video.model.js";
import {ApiError} from "../utils/ApiError.js";
import mongoose from "mongoose";
import {ApiResponse} from "../utils/apiResponse.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import {deleteFromCloudinary} from "../utils/deleteFromCloudinary.js";

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

  //   if (query) {
  //     pipeline.push({
  //       $match: {
  //         $or: [
  //           {title: {$regex: query, $options: "i"}},
  //           {description: {$regex: value, $options: "i"}},
  //         ],
  //       },
  //     });
  //   }

  if (query) {
    pipeline.push({
      $search: {
        index: "search-videos",
        text: {
          query: query,
          path: ["title", "description"],
        },
      },
    });
  }

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

  const existingVideo = await Video.findOne({title});

  if (existingVideo) {
    throw new ApiError(400, "Video with the same title already exists!")
  }
  

  let videoLocalPath;
  if (req.file) {
    videoLocalPath = req.file.path;
  }

  if (!videoLocalPath) {
    throw new ApiError(400, "Video file is required!");
  }

  const videoFile = await uploadOnCloudinary(videoLocalPath);

  if (!videoFile) {
    throw new ApiError(
      400,
      "Something went wrong while uploading on cloudinary"
    );
  }
  const thumbnailUrl = videoFile.public_id
    ? `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/video/upload/w_400,h_300,c_fill/${videoFile.public_id}.jpg`
    : "";

  const video = await Video.create({
    videoFile: videoFile.url,
    owner: req.user?._id,
    title,
    description,
    duration: videoFile.duration || 0,
    thumbnail: thumbnailUrl || "",
    isPublished: true,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video uploaded successfully!"));
});

const getVideoById = asyncHandler(async (req, res) => {
  const {id} = req.params;

  if (!id) {
    throw new ApiError(400, "ID is required!");
  }
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid video ID format!");
  }

  const video = await Video.findById(id);

  if (!video) {
    throw new ApiError(404, "Video not found!");
  }
  return res
    .status(200)
    .json(new ApiResponse(200, video, "Video fetched successfully!"));
});
const updateVideo = asyncHandler(
  asyncHandler(async (req, res) => {
    const {id} = req.params;
    const {title, description} = req.body;

    if (!id) {
      throw new ApiError("400", "ID is required!");
    }
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError(400, "Invalid ID Format!");
    }

    const video = await Video.findByIdAndUpdate(
      id,
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
  const {id} = req.params;

  if (!id) {
    throw new ApiError("400", "ID is required!");
  }

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(400, "Invalid ID Format!");
  }
  const video = await Video.findById(id);

  if (!video) {
    throw new ApiError(505, "Video not found!");
  }

  const cloudinaryVar = deleteFromCloudinary(video.videoFile);

  await Video.findByIdAndDelete(id);

  return res
    .status(200)
    .json(new ApiResponse(200, cloudinaryVar, "Video deleted successfully!"));
});
export {getAllVideos, publishVideo, getVideoById, updateVideo, deleteVideo};
