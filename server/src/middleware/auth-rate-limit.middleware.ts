import { rateLimit } from "express-rate-limit";
import { errorResponse } from "../utils/api-response";

function authLimiter(limit: number, message: string) {
  return rateLimit({
    windowMs: 15 * 60_000,
    limit,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_request, response) => {
      response.status(429).json(errorResponse(message));
    },
  });
}

export const loginRateLimit = authLimiter(
  10,
  "Too many sign-in attempts. Wait 15 minutes and try again.",
);

export const passwordResetRequestRateLimit = authLimiter(
  5,
  "Too many password reset requests. Wait 15 minutes and try again.",
);

export const passwordResetSubmitRateLimit = authLimiter(
  10,
  "Too many password reset attempts. Wait 15 minutes and try again.",
);
