import {ApiError} from "../utils/ApiError.js";
import {asyncHandler} from "../utils/asyncHandler.js";
import {User} from "../models/user.model.js";
import {Video} from "../models/video.model.js";
import {ApiResponse} from "../utils/apiResponse.js";
import jwt from "jsonwebtoken";
import {uploadToSupabase} from "../utils/SupaBase.js";
import {deleteFromSupabase} from "../utils/deleteFromSupabase.js";
import mongoose, {Mongoose, Schema} from "mongoose";
import {Playlist} from "../models/playlist.model.js";


const registerUser = asyncHandler(async (req, res) => {
  const {email, username, password, fullName} = req.body;

  if (
    [fullName, email, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required!");
  }

  const existedUser = await User.findOne({
    $or: [{email}, {username}],
  });
  if (existedUser) {
    throw new ApiError(409, "User with email or username already exists!");
  }

  // Default values to avoid undefined errors
  let avatar = {url: ""};
  let coverImage = {url: ""};

  if (req.files?.avatar?.[0]?.path) {
    const avatarLocalPath = req.files.avatar[0].path;
    avatar = await uploadToSupabase(avatarLocalPath);

    if (!avatar) {
      throw new ApiError(400, "Failed to upload avatar to Supabase");
    }
  }

  if (req.files?.coverImage?.[0]?.path) {
    const coverImageLocalPath = req.files.coverImage[0].path;
    coverImage = await uploadToSupabase(coverImageLocalPath);

    if (!coverImage) {
      throw new ApiError(400, "Failed to upload cover image to Image Kit");
    }
  }

  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage.url,
    email,
    password,
    username: username.toLowerCase(),
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered successfully!"));
});

const generateAccessAndRefreshToken = async (userId) => {
  try {
    const user = await User.findOne(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();
    user.refreshToken = refreshToken;

    await user.save({validateBeforeSave: false});

    return {accessToken, refreshToken};
  } catch (error) {
    throw new ApiError(
      500,
      "Something went wrong while generating refresh and access token"
    );
  }
};

const loginUser = asyncHandler(async (req, res) => {
  // details from req.body
  // check if username or email exist
  // find the user
  // password check
  // generate access and refresh token
  // send cookie

  const {username, email, password} = req.body;

  if (!username && !email) {
    throw new ApiError(400, "username or email is required!");
  }

  const user = await User.findOne({
    $or: [{username}, {email}],
  });

  if (!user) {
    throw new ApiError(404, "user does not exist");
  }

  const isPasswordValid = await user.IsPasswordCorrect(password);

  if (!isPasswordValid) {
    throw new ApiError(401, "invalid user credentials");
  }
  const {accessToken, refreshToken} = await generateAccessAndRefreshToken(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
    sameSite: "None",
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken, // also sending tokens in response as front end engr wants to store it in localstorage or if its a mobile application i.e sending details in header
        },
        "User logged in successfully!"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1,
      },
    },
    {
      new: true,
    }
  );
  const options = {
    httpOnly: true,
    secure: true,
    sameSite: "None",
  };

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "Logged out successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies?.refreshToken || req.body?.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Invalid authorization");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    if (incomingRefreshToken !== user.refreshToken) {
      throw new ApiError(401, "Refresh token expired or already used");
    }

    const options = {
      httpOnly: true,
      secure: true,
      sameSite: "None",
    };

    const {accessToken, newRefreshToken} = await generateAccessAndRefreshToken(
      user._id
    );

    res
      .status(201)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          {
            accessToken,
            refreshToken: newRefreshToken,
          },
          "Access Token refreshed successfully"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh Token");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const {oldPassword, newPassword} = req.body;

  if (!oldPassword || !newPassword) {
    throw new ApiError(400, "Old and new password is required");
  }

  const user = await User.findById(req.user?._id);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const isPasswordValid = await user.IsPasswordCorrect(oldPassword);

  if (!isPasswordValid) {
    throw new ApiError(401, "Invalid old password");
  }

  user.password = newPassword;
  await user.save({validateBeforeSave: false});
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "password changed successfully!"));
});

const getCurrentUser = asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new ApiError(401, "User not authenticated!");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "User fetched successfully!"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const {email, fullName} = req.body;

  if (!email || !fullName) {
    throw new ApiError(400, "email or fullName is required!");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        email,
        fullName,
      },
    },
    {
      new: true,
    }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully!"));
});

const updateAvatar = asyncHandler(async (req, res) => {
  const oldFilePath = req.user?.avatar;
  const avatarLocalPath = req.file?.path;

  if (!avatarLocalPath) {
    throw new ApiError(400, "Missing avatar file");
  }
  const avatar = await uploadToSupabase(avatarLocalPath);

  if (!avatar.url) {
    throw new ApiError(400, "Error while uploading avatar on Supabase");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        avatar: avatar.url,
      },
    },
    {new: true}
  ).select("-password");

  deleteFromSupabase(oldFilePath);

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Avatar updated successfully!"));
});

const updateCoverImage = asyncHandler(async (req, res) => {
  const oldFilePath = req.user?.file;
  const coverImageLocalPath = req.file?.path;

  if (!coverImageLocalPath) {
    throw new ApiError(400, "Missing Cover image file");
  }
  const coverImage = await uploadToSupabase(coverImageLocalPath);

  if (!coverImage.url) {
    throw new ApiError(400, "Error while uploading avatar on Supabase");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        coverImage: coverImage.url,
      },
    },
    {new: true}
  ).select("-password");

  deleteFromSupabase(oldFilePath);

  return res
    .status(200)
    .json(new ApiResponse(200, user, "cover image updated successfully!"));
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
  const {username} = req.params;
  const currentUserId = req.user?._id;

  if (!username?.trim()) {
    throw new ApiError(400, "username not found!");
  }

  const channelData = await User.aggregate([
    {
      $match: {
        username: username?.toLowerCase(),
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
      },
    },
    {
      $lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribedTo",
      },
    },
    {
      $addFields: {
        subscribersCount: {
          $size: "$subscribers",
        },
        subscribedToCount: {
          $size: "$subscribedTo",
        },
        isSubscribedTo: currentUserId
          ? {$in: [currentUserId, "$subscribers.subscriber"]}
          : false,
      },
    },
    {
      $project: {
        username: 1,
        fullName: 1,
        email: 1,
        avatar: 1,
        coverImage: 1,
        subscribersCount: 1,
        subscribedToCount: 1,
        isSubscribedTo: 1,
        createdAt: 1,
      },
    },
  ]);

  const videos = await Video.aggregate([
    {
      $match: {isPublished: true},
    },

    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
      },
    },

    {
      $match: {
        "owner.username": username,
      },
    },
    {
      $sort: {
        createdAt: -1,
      },
    },
    {
      $project: {
        owner: 0,
        isPublished: 0,
        updatedAt: 0,
        __v: 0,
      },
    },
  ]);

  const playlists = await Playlist.aggregate([
    {
      $lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
      },
    },
    {
      $match: {
        "owner.username": username,
      },
    },
    {
      $lookup: {
        from: "videos",
        localField: "videos",
        foreignField: "_id",
        as: "videos",
      },
    },

    {
      $sort: {
        createdAt: -1,
      },
    },
    {
      $project: {
        owner: 0,
        updatedAt: 0,
        __v: 0,
      },
    },
  ]);
  const channel = channelData[0];

  if (!channel) {
    throw new ApiError(404, "channel not found");
  }
  channel.videos = videos;
  channel.playlists = playlists;

  return res
    .status(200)
    .json(new ApiResponse(200, channel, "User details fetched successfully!"));
});

const getWatchHistory = asyncHandler(async (req, res) => {
  const user = await User.aggregate([
    {
      $match: {
        _id: new mongoose.Types.ObjectId(req.user?._id),
      },
    },
    {
      $unwind: "$watchHistory",
    },
    {
      $lookup: {
        from: "videos",
        localField: "watchHistory.video",
        foreignField: "_id",
        as: "videoDetails",
        pipeline: [
          {
            $lookup: {
              from: "users",
              localField: "owner",
              foreignField: "_id",
              as: "owner",
              pipeline: [
                {
                  $project: {
                    username: 1,
                    avatar: 1,
                    fullName: 1,
                  },
                },
              ],
            },
          },
          {
            $addFields: {
              owner: {$first: "$owner"},
            },
          },
        ],
      },
    },
    {
      $addFields: {
        video: {$first: "$videoDetails"},
        duration: "$videoDetails.duration",
        lastWatchedAt: "$videoDetails.lastWatchedAt",
      },
    },
    {
      $project: {
        video: 1,
        duration: 1,
        lastWatchedAt: 1,
      },
    },
    {
      $sort: {
        lastWatchedAt: -1,
      },
    },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Watch history fetched successfully!"));
});

const addOrUpdateWatchHistory = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  const {videoId, duration} = req.body;


  if (!userId) {
    throw new ApiError(400, "User Id is required!");
  }
  if (!videoId) {
    throw new ApiError(400, "Video Id is required!");
  }
  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid Video Id format!");
  }

  // update if video already exists.

  const user = await User.findOneAndUpdate(
    {
      _id: userId,
      "watchHistory.video": videoId,
    },
    {
      $set: {
        "watchHistory.$.duration": duration,
        "watchHistory.$.lastWatchedAt": new Date(),
      },
    },
    {new: true}
  );
  // if video dosent exist, push a new entry.
  if (!user) {
    await User.findByIdAndUpdate(
      userId,
      {
        $push: {
          watchHistory: {
            video: videoId,
            duration: typeof duration === "number" ? duration : 0,
            lastWatchedAt: new Date(),
          },
        },
      },
      {new: true}
    );
    return res
      .status(200)
      .json(new ApiResponse(200, "Watch history updated successfully!"));
  }

  return res
    .status(200)
    .json(new ApiResponse(200, "User's watch history added successfully!"));
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateAvatar,
  updateCoverImage,
  getUserChannelProfile,
  getWatchHistory,
  addOrUpdateWatchHistory,
};
