import express from "express";
import authRoutes from "./routes/authRoutes";
import { CreateService, SetAvailability ,getServices } from "./controller/authController";
import { isService_Provider, isUser, authenticate } from "./middleware/auth";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.use("/auth", authRoutes);
app.post("/services", authenticate, isService_Provider, CreateService);
app.post(
  "/services/:serviceId/availability",
  authenticate,
  isService_Provider,
  SetAvailability,
);
app.get("/services",getServices)
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
