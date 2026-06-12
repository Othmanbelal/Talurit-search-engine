import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        surface: "#111827",
        panel: "rgba(255,255,255,0.06)",
        line: "rgba(255,255,255,0.12)",
        accent: "#d4af37",
      },
      boxShadow: {
        industrial: "0 24px 80px rgba(0,0,0,0.35)",
      },
    },
  },
  plugins: [],
} satisfies Config;
