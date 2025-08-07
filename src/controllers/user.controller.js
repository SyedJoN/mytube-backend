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
import {Telemetry} from "../models/telemetry.model.js";
import { getCookieOptions } from "../utils/GetCookieOptions.js";

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

export const generateAccessAndRefreshToken = async (userId) => {
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

  const tokenExpiry =  15 * 60 * 1000;
  const refreshExpiry = 7 * 24 * 60 * 60 * 1000;
  const loginFlagExpiry = refreshExpiry;

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

  const responseData = {
    user: loggedInUser,
  };
  if (process.env.CLIENT_TYPE === "mobile") {
    responseData.accessToken = accessToken;
    responseData.refreshToken = refreshToken;
  }

  return res
    .status(200)
    .cookie("accessToken", accessToken, getCookieOptions(true, tokenExpiry))
    .cookie("refreshToken", refreshToken, getCookieOptions(true, refreshExpiry))
    .cookie("login_flag", true, getCookieOptions(false, loginFlagExpiry))
    .json(
      new ApiResponse(
        200,
          responseData,
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
 
  return res
    .status(200)
    .clearCookie("accessToken", getCookieOptions(true, new Date(0), false))
    .clearCookie("refreshToken", getCookieOptions(true, new Date(0), false))
    .clearCookie("login_flag", getCookieOptions(false, new Date(0), false))
    .json(new ApiResponse(200, {}, "Logged out successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const refreshTokenFromCookie = req.cookies?.refreshToken;

  if (!refreshTokenFromCookie) {
    throw new ApiError(401, "Refresh token missing");
  }

  try {
    const decodedToken = jwt.verify(
      refreshTokenFromCookie,
      process.env.REFRESH_TOKEN_SECRET
    );
    const user = await User.findById(decodedToken?._id);
    if (!user) {
      throw new ApiError(400, "Invalid Refresh Token: User not found");
    }
    if (user.refreshToken !== refreshTokenFromCookie) {
      throw new ApiError(401, "Token Mismatch. Possible Token Theft Detected");
    }
    const {accessToken, refreshToken: newRefreshToken} =
      await generateAccessAndRefreshToken(user._id);

    await User.findByIdAndUpdate(user._id, {
      refreshToken: newRefreshToken,
    });

    const tokenExpiry = 15 * 60 * 1000;
    const refreshExpiry = 7 * 24 * 60 * 60 * 1000;
    const loginFlagExpiry = refreshExpiry;

    res
      .cookie("accessToken", accessToken, getCookieOptions(true, tokenExpiry))
      .cookie(
        "refreshToken",
        newRefreshToken,
        getCookieOptions(true, refreshExpiry)
      )
      .cookie("login_flag", true, getCookieOptions(false, loginFlagExpiry));

    return res
      .status(200)
      .json(
        new ApiResponse(
          200,
          {accessToken},
          "Access token refreshed successfully."
        )
      );
  } catch (error) {
    console.error("Refresh Token Error:", error.message);
    throw new ApiError(401, "Invalid or Expired Refresh Token");
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

const addOrUpdateWatchHistory = asyncHandler(async (req, res) => {
  const userId = req.user?._id;
  const {videoId} = req.body;

  if (!userId) throw new ApiError(400, "User Id is required!");
  if (!videoId) throw new ApiError(400, "Video Id is required!");
  if (!mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid Video Id format!");
  }

  // 📥 Telemetry se latest resume time nikal lo
  const latestTelemetry = await Telemetry.findOne({
    user: userId,
    video: videoId,
    currentTime: {$exists: true},
  })
    .sort({timestamp: -1}) // latest record
    .select("currentTime timestamp");

  // ⛔ Agar telemetry hi nahi mili
  if (!latestTelemetry) {
    return res
      .status(400)
      .json(new ApiResponse(400, null, "No telemetry found for this video."));
  }

  const resumeTime = latestTelemetry.currentTime || 0;

  const watchEntry = {
    duration: resumeTime,
    lastWatchedAt: new Date(),
  };

  // 🔁 Update agar already video history mein hai
  const updatedUser = await User.findOneAndUpdate(
    {
      _id: userId,
      "watchHistory.video": videoId,
    },
    {
      $set: {
        "watchHistory.$.duration": watchEntry.duration,
        "watchHistory.$.lastWatchedAt": watchEntry.lastWatchedAt,
      },
    },
    {new: true}
  );

  // ➕ Naya add karo agar nahi tha
  if (!updatedUser) {
    await User.findByIdAndUpdate(
      userId,
      {
        $push: {
          watchHistory: {
            video: videoId,
            ...watchEntry,
          },
        },
      },
      {new: true}
    );
  }

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Watch history synced with telemetry!"));
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
  addOrUpdateWatchHistory,
};
