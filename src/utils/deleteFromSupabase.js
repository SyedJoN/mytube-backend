

export const deleteFromSupabase = async (filePath, bucketName = "videos") => {
  try {
    if (!filePath) return null;

    const { error } = await supabase.storage.from(bucketName).remove([filePath]);

    if (error) throw error;

    console.log("Supabase file deleted:", filePath);
    return { success: true };
  } catch (error) {
    console.error("Error deleting Supabase file:", error.message || error);
    return null;
  }
};
