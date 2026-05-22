# AI-Powered Website QA Auditor

This is a full-stack Next.js application that provides an AI-powered website auditing tool. It uses Playwright for browser automation, OpenAI for intelligent analysis, and generates detailed PDF reports of the results.

## Prerequisites

Before you can run the application, make sure you have the following installed:
- Node.js (v18 or higher recommended)
- npm, yarn, pnpm, or bun

## Setup Instructions

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Environment Variables:**
   Create a `.env.local` file in the root of the project by copying `.env.local.example`:
   ```bash
   cp .env.local.example .env.local
   ```
   Then, open `.env.local` and add your required API keys:
   - `OPENAI_API_KEY`: Required for the AI analysis features.
   - `GOOGLE_SAFE_BROWSING_API_KEY`: (Optional) Used for security checks.

## Running the Application

To start the development server, run the following command:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new). Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
