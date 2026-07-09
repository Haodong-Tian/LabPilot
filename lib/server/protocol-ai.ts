import "server-only";

export type SourceType = "text" | "pdf" | "word" | "image";

const systemPrompt = "Convert the supplied laboratory protocol into JSON only. Return title, description, version, objective, steps. Each step must have title, instruction, materials (array), timerMinutes only when explicitly stated, warning when ambiguous or safety-relevant, expectedObservation, userInputFields (array). Never invent quantities, temperatures, timings, or safety-critical conditions. Use empty strings or a 'Needs review' warning for uncertainty.";

export async function structureProtocol(text: string, sourceType: SourceType, imageDataUrl?: string) {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is not configured. Add it to .env.local and restart the server.");
  const content = imageDataUrl ? [{ type: "text", text: `${systemPrompt}\nExtract the readable protocol text from this image, then structure it. Preserve uncertainty.` }, { type: "image_url", image_url: { url: imageDataUrl } }] : `${systemPrompt}\n\nSource type: ${sourceType}\n\nProtocol text:\n${text}`;
  const response = await fetch("https://api.openai.com/v1/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }, body: JSON.stringify({ model: "gpt-4o-mini", response_format: { type: "json_object" }, messages: [{ role: "system", content: systemPrompt }, { role: "user", content }] }) });
  const data = await response.json() as { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string } };
  if (!response.ok) throw new Error(data.error?.message || "AI import failed.");
  const raw = data.choices?.[0]?.message?.content;
  if (!raw) throw new Error("AI returned an empty draft.");
  try { return JSON.parse(raw) as unknown; } catch { throw new Error("AI returned invalid JSON. Please try again."); }
}
