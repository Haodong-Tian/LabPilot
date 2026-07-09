import { NextResponse } from "next/server";
import { structureProtocol } from "@/lib/server/protocol-ai";

export async function POST(request: Request) { try { const { text, sourceType = "text", sourceName } = await request.json() as { text?: string; sourceType?: "text"; sourceName?: string }; if (!text?.trim()) return NextResponse.json({ error: "Paste protocol text before importing." }, { status: 400 }); const draft = await structureProtocol(text, sourceType); return NextResponse.json({ draft, sourceType, sourceName, extractedText: text }); } catch (cause) { return NextResponse.json({ error: cause instanceof Error ? cause.message : "Could not import this protocol." }, { status: 500 }); } }
