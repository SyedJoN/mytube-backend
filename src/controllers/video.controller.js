import {asyncHandler} from "../utils/asyncHandler";
import {Video} from "../models/video.model";
import {ApiError} from "../utils/ApiError";
import mongoose from "mongoose";
import { ApiResponse } from "../utils/apiResponse";

const getAllVideos = asyncHandler(async (req, res) => {
  // sari queries extract kro userId k sath
  // queries me page aur limit ko convert kro number me
  // sirf published videos ko dikhao
  // query ki basis py pipeline bnao
  // agr specific user ki videos dekhna hai to usko check kro

  const {page = 1, limit = 10, query, sortBy, sortType, userId} = req.query;

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

  if (userId && mongoose.Types.ObjectId.isValid(userId)) {
    pipeline.push({
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    });
  }

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
        createdAt: -1
    }
})
  pipeline.push({
    $project: {
        title: 1,
        description: 1,
        thumbnail: 1,
        views: 1,
        owner: 1,
        createdAt: 1
    }
  }
  
  )

  const options = {
    pageNumber: parseInt(page, 10),
    limitNumber: parseInt(limit, 10),
    skip: (pageNumber - 1) * limitNumber,
  };
  const videoAggregate = Video.aggregate(pipeline);

  const video = await Video.aggregatePaginate(videoAggregate, options);

  return res
  .status(200)
  .json(
    new ApiResponse(
        200, video, "All videos fetched successfully"
    )
  )

});


export {
    getAllVideos
}