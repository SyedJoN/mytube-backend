import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";
import mime from "mime-types";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const getCorrectContentType = (fileExt) => {
  const videoTypes = {
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.ogg': 'video/ogg',
    '.avi': 'video/avi',
    '.mov': 'video/quicktime',
    '.wmv': 'video/x-ms-wmv',
    '.flv': 'video/x-flv',
    '.mkv': 'video/x-matroska'
  };
  
 
  if (videoTypes[fileExt.toLowerCase()]) {
    return videoTypes[fileExt.toLowerCase()];
  }
  

  return mime.lookup(fileExt) || "application/octet-stream";
};

export const uploadToSupabase = async (localFilePath, bucketName = "videos") => {
  try {
    if (!fs.existsSync(localFilePath)) return null;
    
    const fileBuffer = fs.readFileSync(localFilePath);
    const fileExt = path.extname(localFilePath);
    const fileName = `${uuidv4()}${fileExt}`;
    
    const contentType = getCorrectContentType(fileExt);
    
    const { data, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(fileName, fileBuffer, {
        contentType, 
        upsert: false,
      });

    if (uploadError) throw new Error(uploadError.message);

    const { data: publicData, error: urlError } = supabase.storage
      .from(bucketName)
      .getPublicUrl(fileName);

    if (urlError || !publicData?.publicUrl) {
      throw new Error("Failed to get public URL");
    }

    fs.unlinkSync(localFilePath);
    
    return {
      url: publicData.publicUrl,
      fileId: data.path,
    };
  } catch (err) {
    console.error("Upload Error:", err.message);
    try {
      fs.unlinkSync(localFilePath);
    } catch (_) {}
    return null;
  }
};