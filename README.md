# Ai-directory (AmzBooks Hub)

An Amazon Kindle & Flipkart Kobo e-book deal directory and comparison platform built for Indian readers.

## 🚀 Features

- **Hourly Price & Deal Tracking**: Live verified prices for self-help, business, technology, finance, and sci-fi e-books.
- **Live Search & Dynamic Sorting**: Search by title/author and sort by price, rating, or discount %.
- **Side-by-Side Spec Comparison**: Compare prices, author details, page counts, pros/cons, and specs side-by-side.
- **Instant Deal Alerts**: WhatsApp and Email price drop alert subscription mechanism.
- **Affiliate Redirect Engine**: Click telemetry and analytics tracking via `/go/:slug`.
- **Founder Admin Dashboard**: Complete telemetry metric analytics center and catalog manager at `/admin`.

## 🛠️ Stack

- **Backend**: Node.js & Express.js
- **Database**: Local JSON database with optional Firebase Realtime DB sync
- **Frontend**: Vanilla HTML5, Modern CSS (Design Tokens, Dark Theme), Native JavaScript
- **SEO**: XML Sitemap, Robots.txt, OpenGraph Meta Tags

## 💻 Running Locally

```bash
# Install dependencies
npm install

# Start Express Server
npm start
```

Visit `http://localhost:3000` in your browser.

## ⚡ Core Overhauls & Telemetry

Recently added premium architecture optimizations:
- **Dynamic Storefront Servicing**: Homepage moved from static public assets to dynamically rendered templates in Express, preventing state desynchronization.
- **Glassmorphic Aesthetics**: Modernized navbar themes, translucent glowing search inputs, and hover scale effects on card details.
- **Interaction Observers**: Integrated `IntersectionObserver` on search card nodes for logging real-world viewport impressions to the dashboard logs.

