const express = require("express");
const authRoutes = require("./routes/authRoutes");
const cors = require("cors");
require("dotenv").config();

const app = express();


app.use(cors({
    origin: "https://prep-pk9wwv444-durgaprasads-projects-e0a9901b.vercel.app",
    credentials: true,
}));

app.use(express.json());

app.use("/api/auth", authRoutes);

const PORT = process.env.PORT || 8080;

app.get('/', (req, res) => {
  res.send('API is running');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
