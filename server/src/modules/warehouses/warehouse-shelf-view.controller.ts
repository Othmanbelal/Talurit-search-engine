import type { Request, Response } from "express";
import { getLocationCodes, getShelfView } from "./warehouse-shelf-view.service";

export async function getShelfViewController(request: Request, response: Response) {
  const { id } = request.params;
  const result = await getShelfView(id);
  response.json({ success: true, data: result });
}

export async function getLocationCodesController(request: Request, response: Response) {
  const { id } = request.params;
  const codes = await getLocationCodes(id);
  response.json({ success: true, data: { codes } });
}
