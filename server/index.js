const express = require("express");
const authRoutes = require("./routes/authRoutes");
const cors = require("cors");
require("dotenv").config();

const app = express();

const allowedOrigins = [
  "https://prep-pk9wwv444-durgaprasads-projects-e0a9901b.vercel.app",
  "https://prep-ai-git-master-durgaprasads-projects-e0a9901b.vercel.app"
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);

app.use(express.json());

app.use("/api/auth", authRoutes);

const PORT = process.env.PORT || 8080;

app.get("/", (req, res) => {
  res.send("API is running");
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
