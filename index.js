import express from "express";
import dotenv from "dotenv";
import crypto from "crypto";
import { Octokit } from "@octokit/rest";
import bodyParser from "body-parser";

dotenv.config();

const app = express();
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

// ✅ Use raw body for signature verification
app.use(
  bodyParser.json({
    verify: (req, res, buf) => {
      req.rawBody = buf;
    },
  })
);

const GITHUB_WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

// ✅ Verify webhook signature
function verifySignature(req) {
  const signature = req.headers["x-hub-signature-256"];
  const hmac = crypto.createHmac("sha256", GITHUB_WEBHOOK_SECRET);
  const digest = `sha256=${hmac.update(req.rawBody).digest("hex")}`;
  return signature === digest;
}

// 🌐 Basic route
app.get("/", (_, res) => res.send("✅ Webhook server is live"));

// 📦 Webhook route
app.post("/webhook", async (req, res) => {
  if (!verifySignature(req)) {
    return res.status(401).send("❌ Invalid signature");
  }

  const event = req.headers["x-github-event"];
  const payload = req.body;

  if (event === "pull_request" && payload.action === "opened") {
    const pr = payload.pull_request;
    console.log(`🆕 PR Opened: #${pr.number} by ${pr.user.login}`);
    console.log(`Title: ${pr.title}`);

    // Fetch changed files
    const { data: files } = await octokit.pulls.listFiles({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      pull_number: pr.number,
    });

    console.log("📂 Changed files:");
    files.forEach((file) => console.log(`- ${file.filename}`));
  }

  res.sendStatus(200);
});

const PORT = 3000;
app.listen(PORT, () => console.log(`🚀 Webhook server running on port ${PORT}`));
