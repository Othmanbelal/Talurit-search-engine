import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "./auth-context";
import { ToastProvider } from "../components/feedback/ToastProvider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>{children}</ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
