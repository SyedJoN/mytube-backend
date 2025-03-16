import mongoose from "mongoose";
import {Playlist} from "../models/playlist.model.js";
import { Video } from "../models/video.model.js";
import {ApiError} from "../utils/ApiError.js";
import {asyncHandler} from "../utils/asyncHandler.js";
import {ApiResponse} from "../utils/apiResponse.js";

const createPlaylist = asyncHandler(async (req, res) => {
  const {name, description} = req.body;

  if (!name || !description) {
    throw new ApiError(400, "All fields are required!");
  }

  const playList = await Playlist.create({
    name: name,
    description: description,
    owner: req.user?._id,
  });

  if (!playList) {
    throw new ApiError(500, "Error while creating playlist.");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, playList, "Playlist created successfully!"));
});

const getUserPlaylists = asyncHandler(async (req, res) => {
  const {userId} = req.params;

  if (!userId) {
    throw new ApiError(400, "User's id is required!");
  }

  if (!mongoose.Types.ObjectId.isValid(userId)) {
    throw new ApiError(400, "Invalid id format!");
  }

  const userPlaylist = await Playlist.find({owner: userId});

  if (!userPlaylist) {
    throw new ApiError(404, "No playlist found!");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, userPlaylist, "Playlists fetched successfully!")
    );
});

const getPlaylistById = asyncHandler(async (req, res) => {

  const {playlistId} = req.params;
  
  if (!playlistId) {
    throw new ApiError(400, "Playlist's id is required!");
  }

  if (!mongoose.Types.ObjectId.isValid(playlistId)) {
    throw new ApiError(400, "Invalid playlist id format!");
  }
 
  const playlist = await Playlist.findById(playlistId).populate("videos").sort({createdAt: -1});

  if (!playlist) {
    throw new ApiError(404, "Playlist not found!")
  }
  return res
  .status(200)
  .json(
    new ApiResponse(
        200,
        playlist,
        "Playlist fetched successfully!"
    )
  )
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {

  const {playlistId, videoId} = req.params;

  if(!playlistId) {
    throw new ApiError(400, "playlist id is required!")
  }
  if(!videoId) {
    throw new ApiError(400, "video id is required!")
  }
  if (!mongoose.Types.ObjectId.isValid(playlistId) || !mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid id format!");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found!")
  }


  const addVideoToPlaylist = await Playlist.findByIdAndUpdate(
    playlistId,
    { $addToSet: { videos: video._id } }, // `$addToSet` ensures unique entries
    { new: true }
  );

  if (!addVideoToPlaylist) {
    throw new ApiError(500, "Playlist not found!")
  }

  return res
  .status(200)
  .json(
    new ApiResponse(
        200,
        {},
        "Video added to playlist successfully!"
    )
  )
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {

  const {playlistId, videoId} = req.params;
  if(!playlistId) {
    throw new ApiError(400, "playlist id is required!")
  }
  if(!videoId) {
    throw new ApiError(400, "video id is required!")
  }
  if (!mongoose.Types.ObjectId.isValid(playlistId) || !mongoose.Types.ObjectId.isValid(videoId)) {
    throw new ApiError(400, "Invalid id format!");
  }

  const video = await Video.findById(videoId);

  if (!video) {
    throw new ApiError(404, "Video not found!")
  }
  const deleteVideoFromPlaylist = await Playlist.findByIdAndUpdate(
    playlistId,
    { $pull: { videos: video._id } },
    { new: true }
  );

  if (!deleteVideoFromPlaylist) {
    throw new ApiError(500, "Playlist not found!")
  }

  return res
  .status(200)
  .json(
    new ApiResponse(
        200,
        {},
        "Video removed from playlist successfully!"
    )
  )

});

const deletePlaylist = asyncHandler(async (req, res) => {
  const {playlistId} = req.params;

  if(!playlistId) {
    throw new ApiError(400, "Playlist id is required!")
  }

  if (!mongoose.Types.ObjectId.isValid(playlistId)) {
    throw new ApiError(400, "Invalid id format!");
  }

  const deletedPlayList = await Playlist.findByIdAndDelete(playlistId);

  if (!deletePlaylist) {
    throw new ApiError(500,
        "Error while deleting playlist"
    )
  }

  return res
  .status(200)
  .json(
    new ApiResponse(
        200,
        {},
        "Playlist deleted successfully!"
    )
  )
});

const updatePlaylist = asyncHandler(async (req, res) => {
  const {playlistId} = req.params;
  const {name, description} = req.body;

  if(!playlistId) {
    throw new ApiError(400, "Playlist id is required!")
  }

  if (!mongoose.Types.ObjectId.isValid(playlistId)) {
    throw new ApiError(400, "Invalid id format!");
  }

  if(!name || !description) {
    throw new ApiError(400, "All fields are required!")
  }

  const updatedPlaylist = await Playlist.findByIdAndUpdate(playlistId, {
    $set: {
        name: name,
        description: description
    }
  },{
    new: true
  })

  if (!updatePlaylist) {
    throw new ApiError(500, "Error while updating playlist.")
  }

  return res
  .status(200)
  .json(
    new ApiResponse(
        200,
        updatedPlaylist,
        "Playlist updated"
    )
  )
  
});

export {
  createPlaylist,
  getUserPlaylists,
  getPlaylistById,
  addVideoToPlaylist,
  removeVideoFromPlaylist,
  deletePlaylist,
  updatePlaylist,
};
