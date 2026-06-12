import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { asyncHandler } from "../../utils/async-handler";
import { scanQrCodeController } from "./qr-scan.controller";

export const qrScanRoutes = Router();

qrScanRoutes.use(requireAuth);
qrScanRoutes.post("/qr", asyncHandler(scanQrCodeController));
