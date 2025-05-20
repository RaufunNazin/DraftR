# Draftr

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Table of Contents

- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Features](#features)
- [Environment Variables](#environment-variables)
- [Scripts](#scripts)
- [Learn More](#learn-more)
- [Deploy on Vercel](#deploy-on-vercel)

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Project Structure

```
.
├── app/                # Next.js app directory (routes, pages, layouts)
├── components/         # React components
├── hooks/              # Custom React hooks
├── lib/                # Server-side logic and utilities
├── prisma/             # Prisma schema and migrations
├── types/              # TypeScript types
├── public/             # Static assets
├── .env.example        # Example environment variables
├── next.config.mjs     # Next.js configuration
├── package.json        # Project metadata and scripts
└── README.md           # Project documentation
```

## Features

- Tournament creation, editing, and deletion (admin only)
- Captain and player management
- Auction and dashboard modules
- Authentication and authorization
- Responsive UI with Tailwind CSS

## Environment Variables

Copy `.env.example` to `.env` and fill in the required values.

## Scripts

- `npm run dev` – Start development server
- `npm run build` – Build for production
- `npm start` – Start production server
- `npm run lint` – Run ESLint

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs)
- [Learn Next.js](https://nextjs.org/learn)
- [Next.js GitHub Repository](https://github.com/vercel/next.js)

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out the [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.