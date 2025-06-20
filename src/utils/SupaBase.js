import fs from "fs";
import path from "path";
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from "uuid";


const supabase = createClient(
  process.env.SUPABASE_URL,             
  process.env.SUPABASE_SERVICE_ROLE_KEY  
);

export const uploadToSupabase = async (localFilePath, bucketName = "videos") => {
  try {
    if (!fs.existsSync(localFilePath)) return null;

    const fileBuffer = fs.readFileSync(localFilePath);
    const fileExt = path.extname(localFilePath);
    const fileName = `${uuidv4()}${fileExt}`;

    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(fileName, fileBuffer, {
        contentType: fileExt === ".mp4" ? "video/mp4" : "image/png",
        upsert: false,
      });

    if (error) throw error;

    const { data: publicUrl } = supabase.storage.from(bucketName).getPublicUrl(fileName);

    fs.unlinkSync(localFilePath);

    return {
      url: publicUrl.publicUrl,
      fileId: data.path,
    };
  } catch (err) {
    console.error("Upload Error:", err.message);
    return null;
  }
};
