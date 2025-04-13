require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const app = express();
const cors = require("cors");
const cookieParser = require("cookie-parser");

const assetRoutes = require("./routes/assetRoute");
const userRoutes = require("./routes/userRoute");
const roomRoutes = require("./routes/roomRoute");
const authRoutes = require("./routes/authRoute");
const importRouter = require("./routes/importDB.Route");
const exportRouter = require("./routes/exportDB.Route");
const chatRouter = require("./routes/chatRoute");
const { initPinecone } = require('./services/pineconeService');

app.use(express.json());

const dbURI = process.env.MONGODB_URI;
if (!dbURI) {
  console.error("MongoDB connection string is not defined.");
  process.exit(1);
}

mongoose
  .connect(dbURI)
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.log("Error connecting to MongoDB:", err);
    process.exit(1);
  });
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);
app.use(cookieParser());

app.use("/api/asset", assetRoutes);
app.use("/api/user", userRoutes);
app.use("/api/room", roomRoutes);
app.use("/api/import", importRouter);
app.use("/api/export", exportRouter);
app.use("/api/auth", authRoutes);
app.use("/api/chat", chatRouter);

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
