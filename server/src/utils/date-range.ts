export function startOfCurrentWeek(referenceDate = new Date()) {
  const start = new Date(referenceDate);
  const day = start.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;

  start.setDate(start.getDate() + mondayOffset);
  start.setHours(0, 0, 0, 0);

  return start;
}
