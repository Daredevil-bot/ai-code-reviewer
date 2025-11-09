Automated AI-powered code review tool for GitHub Pull Requests.
This bot analyzes PR code, provides feedback, suggests improvements, and helps maintain clean, high-quality code in your repositories.
🚀 Features
Reviews new PR code and comments on issues or improvements.
Provides suggestions on coding standards, performance, security, and best practices.
Supports JavaScript, TypeScript, React, Node.js, and easily extendable to other languages.
Integrates with GitHub Actions for automated PR reviews.
Configurable feedback style: concise, detailed, or educational.
🛠️ How It Works
GitHub webhook triggers the bot when a PR is opened or updated.
The bot extracts diff code from the PR.
Sends the code to an AI model (OpenAI API) for review.
Comments directly on the PR with actionable suggestions.
