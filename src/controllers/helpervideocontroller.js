const getAllVideos = asyncHandler(async (req, res) => {
  const { 
    page = 1, 
    limit = 10, 
    query, 
    sortBy, 
    sortType, 
    userId, 
    category, 
    trending 
  } = req.query;

  const pageNumber = parseInt(page, 10);
  const limitNumber = parseInt(limit, 10);
  const skip = (pageNumber - 1) * limitNumber;

  const pipeline = [];

  // 📌 1️⃣ Filter only published videos
  pipeline.push({
    $match: {
      isPublished: true,
    },
  });

  // 📌 2️⃣ Search query for title/description
  if (query) {
    pipeline.push({
      $match: {
        $or: [
          { title: { $regex: query, $options: "i" } },
          { description: { $regex: query, $options: "i" } },
        ],
      },
    });
  }

  // 📌 3️⃣ Filter by category (e.g., "Music", "Gaming", "Tech")
  if (category) {
    pipeline.push({
      $match: {
        category: { $regex: category, $options: "i" },
      },
    });
  }

  // 📌 4️⃣ Filter videos by a specific user (e.g., when visiting a channel)
  if (userId && mongoose.Types.ObjectId.isValid(userId)) {
    pipeline.push({
      $match: {
        owner: new mongoose.Types.ObjectId(userId),
      },
    });
  }

  // 📌 5️⃣ If trending videos are requested, sort by views in descending order
  if (trending) {
    pipeline.push({
      $sort: { views: -1 },
    });
  }

  // 📌 6️⃣ Lookup to get video owner's details
  pipeline.push({
    $lookup: {
      from: "users",
      localField: "owner",
      foreignField: "_id",
      as: "owner",
      pipeline: [
        {
          $project: {
            fullName: 1,
            username: 1,
            avatar: 1,
          },
        },
      ],
    },
  });

  // 📌 7️⃣ Convert owner array to a single object
  pipeline.push({
    $addFields: {
      owner: { $arrayElemAt: ["$owner", 0] },
    },
  });

  // 📌 8️⃣ Sorting logic (latest, most viewed, etc.)
  if (sortBy) {
    pipeline.push({
      $sort: { [sortBy]: sortType === "asc" ? 1 : -1 },
    });
  } else {
    // Default sort by newest videos first
    pipeline.push({
      $sort: { createdAt: -1 },
    });
  }

  // 📌 9️⃣ Pagination (skip & limit)
  pipeline.push({ $skip: skip }, { $limit: limitNumber });

  // 📌 🔟 Projection: return only required fields
  pipeline.push({
    $project: {
      title: 1,
      description: 1,
      videoFile: 1,
      thumbnail: 1,
      duration: 1,
      views: 1,
      createdAt: 1,
      owner: 1,
    },
  });

  // Execute aggregation
  const videos = await Video.aggregate(pipeline);

  // Count total videos for pagination (without limit & skip)
  const totalVideos = await Video.countDocuments({ isPublished: true });

  return res.status(200).json(
    new ApiResponse(200, {
      page: pageNumber,
      totalPages: Math.ceil(totalVideos / limitNumber),
      totalVideos,
      videos,
    }, "Videos fetched successfully!")
  );
});
