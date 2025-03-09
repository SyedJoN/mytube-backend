import {v2 as cloudinary} from "cloudinary";

// Delete from Cloudinary
const deleteFromCloudinary = async (oldFileUrl) => {
  try {
    if (!oldFileUrl) return null;

    const publicId = oldFileUrl.split("/").pop().split(".")[0];
    const result = await cloudinary.uploader.destroy(publicId);
    console.log("Cloudinary file deleted:", result);
    return result;
  } catch (error) {
    console.error("Error deleting Cloudinary file:", error);
    return null;
  }
};

export {deleteFromCloudinary};
