import { z } from "zod";

export const qrScanSchema = z.object({
  code: z.string().trim().min(1, "QR code is required").max(1000),
});

export type QrScanInput = z.infer<typeof qrScanSchema>;
