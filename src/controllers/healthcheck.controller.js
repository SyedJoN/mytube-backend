import {ApiError} from "../utils/ApiError.js";
import {ApiResponse} from "../utils/apiResponse.js";
import {asyncHandler} from "../utils/asyncHandler.js";

const healthcheck = (req, res) => {
  return res.status(200).json(new ApiResponse(200, {}, "OK"));
};

export {healthcheck};
