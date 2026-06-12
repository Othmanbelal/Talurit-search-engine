import { AppError } from "../../utils/AppError";

const allowedExtensions = [".xlsx", ".xlsm", ".xls"];

export function validateStructuredImportFile(
  file?: Express.Multer.File,
): asserts file is Express.Multer.File {
  if (!file) throw new AppError("Excel file is required.", 400);
  if (file.size === 0) throw new AppError("Uploaded Excel file is empty.", 400);

  const fileName = file.originalname.toLowerCase();
  const isExcel = allowedExtensions.some((extension) => fileName.endsWith(extension));
  if (!isExcel) throw new AppError("Only .xlsx, .xlsm, or .xls files are supported.", 400);
}
