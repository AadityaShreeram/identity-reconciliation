const express = require("express");
const dotenv = require("dotenv");
const identifyRoute = require("./routes/identify");

dotenv.config();
const app = express();

app.use(express.json());
app.use("/identify", identifyRoute);

app.get("/health", (req,res) => {
  res.json({ status: "ok", message: "Server is running" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

