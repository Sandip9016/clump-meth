const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

// routes
const authRoutes = require("./routes/auth");
const badgeRoutes = require("./routes/badge");
const questionRoutes = require("./routes/question");
const matchRoutes = require("./routes/match");
const practiceMatchRoutes = require("./routes/practicematch");
const friendRoutes = require("./routes/friend");
const adminRoutes = require("./routes/admin");
const notificationRoutes = require("./routes/notification");
const computerGameRoutes = require("./routes/computerGame");
const leaderboardRoutes = require("./routes/leaderboard");
const historyRoutes = require("./routes/history");
const notificationScheduler = require("./cronJobs/notification");

// ✅ Ensure all models are registered at startup
require("./models/PracticeGame");
require("./models/PVPGame");
require("./models/ComputerGame");

// ✅ Import badge socket handler and badge service
const registerBadgeSocket = require("./controller/BadgeSocket");
const badgeService = require("./services/BadgeService");
const registerComputerGameSocket = require("./controller/computerGameSocket");

const app = express();
const server = http.createServer(app);

// static
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// socket.io
const { Server } = require("socket.io");
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

app.set("io", io);

// ✅ Initialize badge socket handler and connect to BadgeService
const badgeSocket = registerBadgeSocket(io);
badgeService.setBadgeSocket(badgeSocket);

// middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// routes
app.use("/api/auth", authRoutes);
app.use("/api/badges", badgeRoutes);
app.use("/api/question", questionRoutes);
app.use("/api/practice", practiceMatchRoutes);
app.use("/api/friend", friendRoutes);
app.use("/api/match", matchRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/computer-game", computerGameRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/history", historyRoutes);
app.use("/api", notificationRoutes);

require("./controller/pvpController")(io);

// ✅ Register Computer Mode Socket Namespace
registerComputerGameSocket(io);

// test route
app.get("/", (req, res) => {
  res.json({ success: true, message: "Server is up and running" });
});
app.get("/health", (req, res) => {
  res.json({ success: true, message: "Health check passed" });
});

// 🔹 CONNECT MONGOOSE (separate)
mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("MongoDB connected");
    notificationScheduler.init();
    // ✅ Seed badge definitions into DB
    const { seedBadges } = require("./config/seedBadges");
    await seedBadges();
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
  });

// 🔹 START SERVER (separate)
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
