import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import { ZodError } from "zod";
import { AppError } from "../utils/AppError";
import { errorResponse } from "../utils/api-response";

export function notFoundMiddleware(request: Request, _response: Response, next: NextFunction) {
  next(new AppError(`Route not found: ${request.method} ${request.originalUrl}`, 404));
}

export function errorMiddleware(
  error: unknown,
  _request: Request,
  response: Response,
  _next: NextFunction,
) {
  if (error instanceof AppError) {
    return response.status(error.statusCode).json(errorResponse(error.message, error.details));
  }

  if (error instanceof ZodError) {
    return response.status(400).json(errorResponse("Invalid request data", error.flatten()));
  }

  if (isRequestBodyError(error)) {
    return response.status(error.statusCode).json(errorResponse("Invalid request body"));
  }

  if (error instanceof multer.MulterError) {
    const message = error.code === "LIMIT_FILE_SIZE" ? "Uploaded file is too large" : error.message;
    return response.status(400).json(errorResponse(message));
  }

  console.error(error);
  return response.status(500).json(errorResponse("Internal server error"));
}

function isRequestBodyError(error: unknown): error is { statusCode: number } {
  return (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    typeof (error as { statusCode?: unknown }).statusCode === "number"
  );
}
