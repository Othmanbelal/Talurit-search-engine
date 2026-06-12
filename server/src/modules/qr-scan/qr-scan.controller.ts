import type { Request, Response } from "express";
import { successResponse } from "../../utils/api-response";
import { qrScanSchema } from "./qr-scan.schemas";
import { scanQrCode } from "./qr-scan.service";

export async function scanQrCodeController(request: Request, response: Response) {
  const input = qrScanSchema.parse(request.body);
  const result = await scanQrCode(input.code);
  return response.json(successResponse(result));
}
