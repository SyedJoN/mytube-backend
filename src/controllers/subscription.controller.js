import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import {ApiError} from "../utils/ApiError.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import { ApiResponse } from "../utils/apiResponse.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const {channelId} = req.params;
    const userId = req.user?._id;

    if (!channelId) {
        throw new ApiError(400, "Id is required!")
    }
    if (!mongoose.Types.ObjectId.isValid(channelId)) {
        throw new ApiError(400, "Invalid id format!")
    }

  const alreadySubscribed = await Subscription.findOne({subscriber: userId, channel: channelId});
    if (alreadySubscribed) {
        await Subscription.findByIdAndDelete(alreadySubscribed._id);
    } else {
        await Subscription.create({
            subscriber: userId,
            channel: channelId,
        })
    }

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            {},
             `Channel ${alreadySubscribed ? 'unsubscribed' : 'subscribed'} successfully!`
        )
    )

})


const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const {channelId} = req.params;

    
    if (!channelId) {
        throw new ApiError(400, "Id is required!")
    }
    if (!mongoose.Types.ObjectId.isValid(channelId)) {
        throw new ApiError(400, "Invalid id format!")
    }

    const userChannelSubscribers = await Subscription.find({channel: channelId}).populate({
        path: "subscriber",
        select: "-email -password -coverImage -watchHistory -createdAt -updatedAt -refreshToken"
    })

    if (!userChannelSubscribers) {
        throw new ApiError(500, "Something went wrong while fetching the subscribers")
    }
    
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            userChannelSubscribers,
            "Channel subscribers fetched successfully!"
        )
    )


})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params

    if (!subscriberId) {
        throw new ApiError(400, "Id is required!")
    }
    if (!mongoose.Types.ObjectId.isValid(subscriberId)) {
        throw new ApiError(400, "Invalid id format!")
    }

    const subscribedChannels = await Subscription.find({subscriber: subscriberId}).populate({
        path: "channel",
        select: "-email -password -coverImage -watchHistory -createdAt -updatedAt -refreshToken"
    });

    if (!subscribedChannels) {
        throw new ApiError(500, "Something went wrong while fetching the subscribers")
    }
    
    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            subscribedChannels,
            "Subscribed channels fetched successfully!"
        )
    )


})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}