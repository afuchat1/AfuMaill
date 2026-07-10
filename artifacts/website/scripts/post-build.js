#!/usr/bin/env node
/**
 * post-build.js
 *
 * Runs after `expo export --platform web`. On Vercel (VERCEL=1) it bakes the
 * landing page template into dist/landing.html with real production values so
 * Vercel can serve it as a static file at /.
 *
 * Outside Vercel (Replit dev) this is a no-op — serve.js injects values at
 * request time from the incoming Host header.
 */

const fs = require("fs");
const path = require("path");

if (!process.env.VERCEL) {
  console.log("post-build: not Vercel — skipping landing page bake.");
  process.exit(0);
}

const templatePath = path.resolve(__dirname, "../server/templates/landing-page.html");
const outPath = path.resolve(__dirname, "../dist/landing.html");

if (!fs.existsSync(templatePath)) {
  console.error("post-build: landing-page.html template not found at", templatePath);
  process.exit(1);
}

const baseUrl = "https://mail.afuchat.com";
const host = "mail.afuchat.com";
const appName = "AfuMail";

let html = fs.readFileSync(templatePath, "utf-8");
html = html
  .replace(/BASE_URL_PLACEHOLDER/g, baseUrl)
  .replace(/EXPS_URL_PLACEHOLDER/g, host)
  .replace(/APP_NAME_PLACEHOLDER/g, appName);

fs.writeFileSync(outPath, html, "utf-8");
console.log("post-build: wrote dist/landing.html (" + html.length + " bytes)");
