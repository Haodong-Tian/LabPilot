declare module "pdf-parse" { const pdfParse: (buffer: Buffer) => Promise<{ text: string }>; export default pdfParse; }
declare module "mammoth" { export function extractRawText(input: { buffer: Buffer }): Promise<{ value: string }>; }
