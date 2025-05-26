const express = require("express");
const authRoutes = require("./routes/authRoutes");
const cors = require("cors");
require("dotenv").config();

const app = express();

// Option 1: Use environment variable (recommended)
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',')
  : [
      "https://prep-pk9wwv444-durgaprasads-projects-e0a9901b.vercel.app",
      "https://prep-ai-git-master-durgaprasads-projects-e0a9901b.vercel.app",
      "https://prep-7a8rb15o5-durgaprasads-projects-e0a9901b.vercel.app",
      "http://localhost:5173", 
    ];

// Option 2: Pattern matching function
function isAllowedOrigin(origin) {
  if (!origin) return true;
  
  // Allow localhost for development
  if (origin.includes('localhost')) return true;
  
  // Allow your Vercel deployments
  if (origin.match(/^https:\/\/prep-.*\.vercel\.app$/)) return true;
  
  // Allow specific origins
  return allowedOrigins.includes(origin);
}

app.use(
  cors({
    origin: function (origin, callback) {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
      } else {
        console.log("Blocked origin:", origin);
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
