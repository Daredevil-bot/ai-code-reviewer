import express from "express";
import dotenv from "dotenv";
import crypto from "crypto";
import { Octokit } from "@octokit/rest";
import bodyParser from "body-parser";
import OpenAI from "openai";

dotenv.config();

const app = express();
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

// 🌐 Root route
app.get("/", (_, res) => res.send("✅ Webhook server with AI Review is live"));

// 📦 Webhook route
app.post("/webhook", async (req, res) => {
  if (!verifySignature(req)) {
    return res.status(401).send("❌ Invalid signature");
  }

  const event = req.headers["x-github-event"];
  const payload = req.body;

  if (event === "pull_request" && payload.action === "opened") {
    const pr = payload.pull_request;
    const owner = payload.repository.owner.login;
    const repo = payload.repository.name;
    const prNumber = pr.number;

    console.log(`🆕 PR Opened: #${prNumber} by ${pr.user.login}`);

    // 🧾 Fetch changed files
    const { data: files } = await octokit.pulls.listFiles({
      owner,
      repo,
      pull_number: prNumber,
    });

    let diffSummary = "";
    files.forEach((file) => {
      diffSummary += `\n### ${file.filename}\n\`\`\`diff\n${file.patch?.slice(0, 2000) || ""}\n\`\`\`\n`;
    });

    // 🤖 Send to OpenAI for review
    const reviewPrompt = `
You are a senior code reviewer. Analyze the following GitHub Pull Request diffs and provide concise, constructive feedback.

${diffSummary}
    `;

    const aiResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are an expert software engineer reviewing code." },
        { role: "user", content: reviewPrompt },
      ],
    });

    const reviewComment = aiResponse.choices[0].message.content;

    // 💬 Post comment on PR
    await octokit.issues.createComment({
      owner,
      repo,
      issue_number: prNumber,
      body: `🤖 **AI Code Review Summary:**\n\n${reviewComment}`,
    });

    console.log("✅ AI review posted to PR!");
  }

  res.sendStatus(200);
});

const PORT = 3000;
app.listen(PORT, () => console.log(`🚀 AI Review Bot running on port ${PORT}`));
