import express from "express";
import dotenv from "dotenv";
import { Octokit } from "@octokit/rest";
import OpenAI from "openai";
import fetch from "node-fetch";

dotenv.config();
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const octokit = new Octokit({ auth: GITHUB_TOKEN });
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// ✅ Webhook endpoint
app.post("/webhook", async (req, res) => {
  try {
    const event = req.headers["x-github-event"];
    console.log(`Received event: ${event}`);

    // We’ll react only to PR opened or synchronized events
    if (event === "pull_request") {
      const action = req.body.action;
      const pr = req.body.pull_request;

      if (action === "opened" || action === "synchronize") {
        const repoOwner = req.body.repository.owner.login;
        const repoName = req.body.repository.name;
        const prNumber = pr.number;

        console.log(`🔍 Fetching diff for PR #${prNumber}`);

        // 1️⃣ Fetch the diff of the PR
        const diffResponse = await fetch(pr.diff_url);
        const diffText = await diffResponse.text();

        // 2️⃣ Build a strong AI prompt
        const prompt = `
You are an experienced senior software engineer reviewing a pull request.
Analyze the following GitHub PR diff and provide:

- 🔍 Summary of what changed
- ⚠️ Potential bugs, logic issues, or security concerns
- 💡 Code improvement or best-practice suggestions
- 🧠 Overall readability and performance feedback

Format the response as a Markdown GitHub comment.

--- START DIFF ---
${diffText}
--- END DIFF ---
`;

        console.log("🤖 Sending diff to OpenAI...");

        // 3️⃣ Get AI feedback
        const aiResponse = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "You are a senior code reviewer." },
            { role: "user", content: prompt },
          ],
          temperature: 0.4,
          max_tokens: 500,
        });

        const aiFeedback = aiResponse.choices[0].message.content;

        console.log("💬 AI Review Generated!");

        // 4️⃣ Post feedback as a PR comment
        await octokit.issues.createComment({
          owner: repoOwner,
          repo: repoName,
          issue_number: prNumber,
          body: `🤖 **AI Code Review**:\n\n${aiFeedback}`,
        });

        console.log(`✅ AI Review posted on PR #${prNumber}`);
      }
    }

    res.status(200).send("Webhook processed successfully");
  } catch (err) {
    console.error("❌ Error:", err);
    res.status(500).send("Internal server error");
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
