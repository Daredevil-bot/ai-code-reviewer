import express from "express";
import dotenv from "dotenv";
import { Octokit } from "@octokit/rest";

dotenv.config();

const app = express();
app.use(express.json());

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

app.get("/", (req, res) => {
  res.send("✅ AI Code Reviewer Backend Running");
});

// Fetch PR details manually
app.get("/fetch-pr/:owner/:repo/:number", async (req, res) => {
  try {
    const { owner, repo, number } = req.params;
    const { data: files } = await octokit.pulls.listFiles({
      owner,
      repo,
      pull_number: number,
    });

    const diffs = files.map((file) => ({
      filename: file.filename,
      patch: file.patch,
    }));

    res.json({
      message: "Fetched PR files successfully",
      diffs,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
