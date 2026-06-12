import morgan from "morgan";
import { env } from "../config/env";

export const requestLogger =
  env.NODE_ENV === "test" ? (_req: unknown, _res: unknown, next: () => void) => next() : morgan("combined");
