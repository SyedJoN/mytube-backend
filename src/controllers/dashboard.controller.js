import mongoose from "mongoose"
import {Video} from "../models/video.model.js"
import {Subscription} from "../models/subscription.model.js"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { ApiResponse } from "../utils/apiResponse.js"

const getChannelStats = asyncHandler(async (req, res) => {

    const userId = req.user?._id;

    const video = await Video.find({
        owner: userId,
        isPublished: true
    })
    const totalViews = video.reduce((acc, video) => acc + video.views, 0);
    
    const totalVideos = video.length;

    const subscribers = await Subscription.countDocuments({channel: userId});

    const videoIds = video.map((video) => video._id);

    const totalLikes = videoIds.length ? await Like.countDocuments({
        video: { 
            $in: videoIds
        }
    }) : 0

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {totalViews, totalVideos, subscribers, totalLikes}
        )
    )

})

const getChannelVideos = asyncHandler(async (req, res) => {
    // TODO: Get all the videos uploaded by the channel
    const userId = req.user?._id;

    const channelVideos = await Video.find({owner: userId});

    if (!channelVideos) {
        throw new ApiError(500, "Something went wrong while fetching channel videos.")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            channelVideos,
            "Channel videos fetched successfully!"
        )
    )
})

export {
    getChannelStats, 
    getChannelVideos
    }