import type { QrScanResult } from "../types/qr-scan";
import { apiRequest } from "./http";

export function scanQrCodeRequest(code: string) {
  return apiRequest<QrScanResult>("/api/scan/qr", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}
