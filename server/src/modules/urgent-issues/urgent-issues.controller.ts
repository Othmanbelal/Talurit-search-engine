import type { Request, Response } from "express";
import type { UrgentIssueStatus } from "@prisma/client";
import { CreateUrgentIssueSchema } from "./urgent-issues.schemas";
import {
  acknowledgeResolution,
  listMyReportedIssues,
  listUrgentIssues,
  markResolved,
  markUnresolved,
  reportUrgentIssue,
} from "./urgent-issues.service";

export async function createUrgentIssueController(req: Request, res: Response) {
  const input = CreateUrgentIssueSchema.parse(req.body);
  const issue = await reportUrgentIssue(
    input.tableId,
    input.stockBalanceId,
    req.user!.id,
    input.message
  );
  res.status(201).json({ success: true, data: issue });
}

export async function listUrgentIssuesController(req: Request, res: Response) {
  const status = (req.query.status === "resolved" ? "resolved" : "open") as UrgentIssueStatus;
  const issues = await listUrgentIssues(req.user!.id, req.user!.role, status);
  res.json({ success: true, data: issues });
}

export async function listMyIssuesController(req: Request, res: Response) {
  const issues = await listMyReportedIssues(req.user!.id);
  res.json({ success: true, data: issues });
}

export async function acknowledgeUrgentIssueController(req: Request, res: Response) {
  const issue = await acknowledgeResolution(req.params.id, req.user!.id);
  res.json({ success: true, data: issue });
}

export async function resolveUrgentIssueController(req: Request, res: Response) {
  const issue = await markResolved(req.params.id, req.user!.id, req.user!.role);
  res.json({ success: true, data: issue });
}

export async function unresolveUrgentIssueController(req: Request, res: Response) {
  const issue = await markUnresolved(req.params.id, req.user!.id, req.user!.role);
  res.json({ success: true, data: issue });
}
