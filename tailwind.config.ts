import type { Config } from "tailwindcss";
export default { content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"], theme: { extend: { colors: { ink: "#18231f", moss: "#296b4d", mist: "#eff5f1", paper: "#fbfdfb" } } }, plugins: [] } satisfies Config;
