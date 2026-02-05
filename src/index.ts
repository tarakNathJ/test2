import express from "express";
import authRoutes from "./routes/authRoutes";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use("/auth", authRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
