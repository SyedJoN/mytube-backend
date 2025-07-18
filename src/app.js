import express, {json, urlencoded} from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
//routes import

import healthcheckRouter from "./routes/healthcheck.route.js"
import userRouter from "./routes/user.route.js";
import dashboardRouter from "./routes/dashboard.route.js"
import subscriptionRouter from "./routes/subscription.route.js"
import videoRouter from "./routes/video.route.js"
import playlistRouter from "./routes/playlist.route.js"
import tweetRouter from "./routes/tweet.route.js"
import likeRouter from "./routes/like.route.js"
import dislikeRouter from "./routes/dislike.route.js"
import commentRouter from "./routes/comment.route.js"
import telemetryRouter from "./routes/telemetry.route.js"

//routes declaration

const app = express();


app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

app.use(
  json({
    limit: "16kb",
  })
);
app.use(
  urlencoded({
    extended: true,
    limit: "16kb",
  })
);
app.use(express.static("public"));
app.use(cookieParser());


app.use("/api/v1/health-check", healthcheckRouter)
app.use("/api/v1/users", userRouter);
app.use("/api/v1/dashboard", dashboardRouter)
app.use("/api/v1/subscriptions", subscriptionRouter)
app.use("/api/v1/videos", videoRouter);
app.use("/api/v1/playlists", playlistRouter);
app.use("/api/v1/tweets", tweetRouter);
app.use("/api/v1/likes", likeRouter);
app.use("/api/v1/dislikes", dislikeRouter);
app.use("/api/v1/comments", commentRouter);
app.use("/api/v1/telemetry", telemetryRouter);

app.use((err, req, res, next) => {
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});



export {app};
