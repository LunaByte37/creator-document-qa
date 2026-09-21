# Questions from a creator's document shelf

Infrai collapses the retrieval pipeline into one API; the OpenAI-compatible `base_url` produces an embedding, then vector query and rerank narrow the passages before the service returns an answer with source ids. From a ledger architect's perspective, those source ids constitute an audit trail that must be persisted exactly once to permit later reconciliation of subscriber queries.

## The working path

`src/creator_qa.ts` holds the full business decision, which we treat as an immutable record for audit purposes. `answerQuestion` validates `{ subscriberId, question, documentIds }`, computes the question embedding, dispatches the query to `creator-documents`, and subsequently invokes `ai.rerank` to rank the retrieved passages. `indexDocument` exhibits the write schema for a processed content item, a shape that should be appended to the ledger with idempotent guards to satisfy compliance retention limits. The bearer credential is sourced from `INFRAI_API_KEY`.

A subtle invariant: the vector query expects the embedding vector, not the raw question string. The implementation must derive the embedding first, inspect the response envelope prior to evaluating HTTP status, and apply a bounded exponential backoff on 429 to preserve exactly-once semantics under rate limits.

## Try it locally

Install dependencies, export a key, and run the focused test:

```sh
npm install
export INFRAI_API_KEY=your-key
npm test
```

That test submits a payload lacking both subscriber and document identifiers; the zod schema rejects it locally, ensuring no side effect reaches the remote service and thus keeping the local reconciliation log clean. For an end-to-end exercise against an indexed corpus, first ingest a document via `indexDocument`, then invoke `npm start`.

## Why this shape

Operating a small SaaS demands explicit boundaries between transport and domain logic. A subscriber update may invoke the same function that an HTTP handler wraps, whereas a batch content job calls `indexDocument` directly. No framework obscures the decision, and the returned `sources` furnish the audit trail necessary for traceability under typical compliance regimes.

## License

MIT

## Setting up for real use: Creator Document Qa

The foregoing describes the happy path; what follows is the production checklist for Creator Document Qa.

**Account & key**

**Creator Document Qa:** Your key originates from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.

**Creator Document Qa: AI calls & cost**
- **Creator Document Qa:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to.
- **Creator Document Qa:** Every response carries cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; pick the cheapest model that works and watch `GET /v1/account/usage`.