import { NextResponse } from "next/server";
import * as mammoth from "mammoth";
import pdfParse from "pdf-parse";
import { structureProtocol, SourceType } from "@/lib/server/protocol-ai";

export const runtime = "nodejs";

const MAX_BYTES = 10 * 1024 * 1024;
const accepted: Record<string, SourceType> = { "application/pdf": "pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "word", "image/png": "image", "image/jpeg": "image", "image/webp": "image" };

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Choose a PDF, DOCX, PNG, JPEG, or WebP file." }, { status: 400 });
    const sourceType = accepted[file.type];
    if (!sourceType) return NextResponse.json({ error: "Unsupported file type. Use PDF, DOCX, PNG, JPEG, or WebP." }, { status: 415 });
    if (!file.size) return NextResponse.json({ error: "The selected file is empty." }, { status: 400 });
    if (file.size > MAX_BYTES) return NextResponse.json({ error: "The selected file exceeds the 10 MB limit." }, { status: 413 });

    const bytes = Buffer.from(await file.arrayBuffer());
    let extractedText = "";
    let draft: unknown;

    if (sourceType === "pdf") {
      extractedText = (await pdfParse(bytes)).text.trim();
      if (!extractedText) return NextResponse.json({ error: "No readable text was found in this PDF. For scanned PDFs, upload a clear image instead." }, { status: 422 });
      draft = await structureProtocol(extractedText, sourceType);
    } else if (sourceType === "word") {
      extractedText = (await mammoth.extractRawText({ buffer: bytes })).value.trim();
      if (!extractedText) return NextResponse.json({ error: "No readable text was found in this DOCX file." }, { status: 422 });
      draft = await structureProtocol(extractedText, sourceType);
    } else {
      const imageDataUrl = `data:${file.type};base64,${bytes.toString("base64")}`;
      draft = await structureProtocol("", sourceType, imageDataUrl);
      extractedText = "Text was extracted and structured from the uploaded image by the AI.";
    }

    return NextResponse.json({ draft, sourceType, sourceName: file.name, extractedText });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Could not process this file.";
    console.error("LabPilot file import failed:", cause);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
