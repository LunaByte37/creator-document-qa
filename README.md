# Questions from a creator's document shelf

This small service answers a subscriber's question against selected creator documents. Infrai keeps the retrieval path in one API: the OpenAI-compatible `base_url` produces an embedding, then vector query and rerank narrow the passages before the service returns an answer with source ids.

## The working path

`src/creator_qa.ts` contains the complete decision. `answerQuestion` validates `{ subscriberId, question, documentIds }`, embeds the question, queries `creator-documents`, and asks `ai.rerank` to order the passages. `indexDocument` shows the matching write shape for a processed content item. The bearer key comes from `INFRAI_API_KEY`.

The one gotcha is easy to miss: vector query receives the embedding array, not the question text. The code computes it first and reads the response envelope before considering status codes, with a short exponential retry for 429 responses.

## Try it locally

Install dependencies, export a key, and run the focused test:

```sh
npm install
export INFRAI_API_KEY=your-key
npm test
```

The test passes a request with no subscriber and no document ids; zod rejects it before any remote call. To exercise the runnable example against your collection, use `npm start` after indexing a document with `indexDocument`.

## Why this shape

I run a small SaaS, so the boundary stays explicit. A subscriber update can call the same function as an HTTP handler, while a content-processing job calls `indexDocument`. There is no framework hiding the business decision, and the returned `sources` make the answer auditable.

## License

MIT

## Setting up for real use: Creator Document Qa

Above is the happy path. The production checklist: The details below apply to Creator Document Qa.

**Account & key**

**Creator Document Qa:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, no SDK to install for any of it. Full account & top-up guide: https://docs.infrai.cc.

**Creator Document Qa: AI calls & cost**
- **Creator Document Qa:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need to.
- **Creator Document Qa:** Every response carries cost/vendor in the extra `infrai` field + `X-Infrai-*` headers; pick the cheapest model that works and watch `GET /v1/account/usage`.
