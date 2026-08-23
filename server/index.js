import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { v4 as uuidv4 } from "uuid";

dotenv.config({ path: ".env.local" });

const app = express();
const PORT = process.env.PORT || 5000;

// In-memory storage for demo
let campaigns = [];

app.use(cors());
app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", message: "Crowdfunding Planning Tool API" });
});

// Get all campaigns
app.get("/api/campaigns", (req, res) => {
  res.json(campaigns);
});

// Create campaign
app.post("/api/campaigns", (req, res) => {
  const { name, currency = "ILS" } = req.body;
  
  if (!name || name.trim() === "") {
    return res.status(400).json({ error: "Campaign name is required" });
  }
  
  const campaign = {
    id: uuidv4(),
    name: name.trim(),
    currency,
    owner_name: "Demo User",
    created_at: new Date().toISOString()
  };
  
  campaigns.push(campaign);
  console.log(`Campaign created: ${campaign.name}`);
  res.status(201).json(campaign);
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(500).json({ error: "Internal server error", message: err.message });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log("CORS enabled for local development");
});