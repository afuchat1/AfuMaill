import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
const allowedOrigins: (string | RegExp)[] = ["https://mail.afuchat.com"];
if (process.env.NODE_ENV !== "production") {
  // Allow Replit preview domains in development only
  allowedOrigins.push(/\.replit\.dev$/, /\.kirk\.replit\.dev$/);
}

app.use(cors({ origin: allowedOrigins, credentials: true }));

// api.mail.afuchat.com is the sole production API host. Only GET requests
// are redirected — POST/PUT/DELETE bodies aren't safely replayed across a
// redirect by every HTTP client, and OAuth token/authorize calls must not
// be silently rerouted. GET-only surfaces (the docs page, discovery
// endpoints) are safe to redirect and this keeps them off non-canonical
// deployment domains.
const CANONICAL_API_HOST = process.env.CANONICAL_API_HOST || "api.mail.afuchat.com";
if (process.env.NODE_ENV === "production") {
  app.use((req, res, next) => {
    if (req.method === "GET" && req.hostname && req.hostname !== CANONICAL_API_HOST) {
      return res.redirect(301, `https://${CANONICAL_API_HOST}${req.originalUrl}`);
    }
    next();
  });
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

export default app;
