export type StagingCounts = {
  readyRows: number;
  reviewRows: number;
  errorRows: number;
};

export function summarizeStatuses(statuses: string[]): StagingCounts {
  return statuses.reduce<StagingCounts>((counts, status) => {
    if (status === "ready") counts.readyRows += 1;
    if (status === "needs_review") counts.reviewRows += 1;
    if (status === "error") counts.errorRows += 1;
    return counts;
  }, { readyRows: 0, reviewRows: 0, errorRows: 0 });
}
