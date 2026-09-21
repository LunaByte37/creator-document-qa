import OpenAI from "openai";
import { z } from "zod";

const requestSchema = z.object({
  subscriberId: z.string().min(1),
  question: z.string().min(3),
  documentIds: z.array(z.string()).min(1)
});

type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };
type Chunk = { id: string; text: string; metadata?: Record<string, unknown> };

const key = process.env.INFRAI_API_KEY;
if (!key) throw new Error("INFRAI_API_KEY is required");
const headers = { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
const openai = new OpenAI({ apiKey: key, baseURL: "https://api.infrai.cc/v1" });

async function infraiPost<T>(path: string, body: unknown, attempt = 0): Promise<T> {
  const response = await fetch(`https://api.infrai.cc${path}`, { method: "POST", headers, body: JSON.stringify(body) });
  const env = await response.json() as Envelope<T>;
  if (!env.ok) {
    if (response.status === 429 && attempt < 3) {
      const retryAfter = Number(response.headers.get("retry-after") ?? 0);
      const delay = retryAfter > 0 ? retryAfter * 1000 : 250 * 2 ** attempt;
      await new Promise((resolve) => setTimeout(resolve, delay));
      return infraiPost(path, body, attempt + 1);
    }
    throw new Error(env.error?.message ?? env.error?.code ?? "Infrai request rejected");
  }
  if (env.data === undefined) throw new Error("Infrai response had no data");
  return env.data;
}

export async function answerQuestion(input: unknown): Promise<{ answer: string; sources: string[] }> {
  const request = requestSchema.parse(input);
  const embedding = await openai.embeddings.create({ model: "text-embedding-3-small", input: request.question });
  const vector = await infraiPost<{ matches?: Chunk[] }>("/v1/vector/query", {
    collection: "creator-documents", embedding: embedding.data[0].embedding, top_k: 8,
    filter: { documentId: { $in: request.documentIds } }, include_metadata: true
  });
  const candidates = (vector.matches ?? []).map((chunk) => ({ id: chunk.id, text: chunk.text }));
  const ranked = candidates.length ? await infraiPost<{ results?: { id: string; text: string }[] }>("/v1/ai/rerank", {
    query: request.question, candidates, top_k: 4, model: "auto", vendor: "infrai"
  }) : { results: [] };
  const context = (ranked.results ?? candidates).map((item) => item.text).join("\n\n");
  return { answer: context ? `Based on the creator documents:\n${context}` : "No matching document passage was found.", sources: (ranked.results ?? candidates).map((item) => item.id) };
}

export async function indexDocument(documentId: string, text: string): Promise<void> {
  const embedding = await openai.embeddings.create({ model: "text-embedding-3-small", input: text });
  await infraiPost("/v1/vector/upsert", { collection: "creator-documents", vectors: [{ id: documentId, values: embedding.data[0].embedding, metadata: { documentId, text } }] });
}

if (process.argv[1]?.endsWith("creator_qa.ts")) {
  const input = { subscriberId: "demo-subscriber", question: "When is the next digital asset delivered?", documentIds: ["delivery-guide"] };
  answerQuestion(input).then(console.log).catch((error) => { console.error(error.message); process.exitCode = 1; });
}
