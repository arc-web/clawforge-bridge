import express from "express";

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

app.get("/api/lookup", (_req, res) => {
  // Agents call this to get Plane URLs for their Paperclip issues
  const paperclipId = _req.query.paperclipId as string;
  // TODO: implement sync record lookup
  res.json({ paperclipId, planeUrl: null });
});

const PORT = process.env.PORT || 3200;
app.listen(Number(PORT), () => console.log(`Bridge listening on :${PORT}`));
