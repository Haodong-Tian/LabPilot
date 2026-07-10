import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { AuthProvider } from "@/components/auth-provider";
export const metadata: Metadata = { title: "LabPilot", description: "Protocol-led laboratory work" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body suppressHydrationWarning><AuthProvider><AppShell>{children}</AppShell></AuthProvider></body></html>; }
