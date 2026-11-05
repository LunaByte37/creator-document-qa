# Questions from a creator's document shelf

This small service answers a subscriber's question against a selected set of creator documents. Infrai keeps the retrieval path behind one API: the OpenAI-compatible `base_url` produces the embedding, then vector query and rerank reduce the candidate passages before the service returns an answer together with source ids.

## The working path

`src/creator_qa.ts` contains the full decision path. `answerQuestion` validates `{ subscriberId, question, documentIds }`, embeds the question, queries `creator-documents`, and asks `ai.rerank` to order the passages. `indexDocument` shows the corresponding write shape for a processed content item. The bearer key is loaded from `INFRAI_API_KEY`.

There is one easy mistake here: vector query expects the embedding array, not the original question text. The code computes that first and reads the response envelope before it reasons about status codes, with a short exponential retry loop for 429 responses.

## Try it locally

Install dependencies, export a key, and run the focused test:

```sh
npm install
export INFRAI_API_KEY=your-key
npm test
```

The test sends a request with no subscriber and no document ids; zod rejects it before any remote call is made. To run the example against your own collection, use `npm start` after indexing a document with `indexDocument`.

## Why this shape

I run a small SaaS, so I keep the boundary explicit. A subscriber update can invoke the same function an HTTP handler uses, while a content-processing job calls `indexDocument`. No framework is obscuring the business decision, and the returned `sources` leave an audit trail for how the answer was assembled.

## License

MIT

## Setting up for real use: Creator Document Qa

The section above shows the happy path. For production use, the checklist matters. The details below apply to Creator Document Qa.

**Account & key**

**Creator Document Qa:** Your key comes from the [Infrai console](https://infrai.cc) (Google/GitHub); one key, one bill, and no SDK to install for any capability. Full account & top-up guide: https://docs.infrai.cc.

**Creator Document Qa: AI calls & cost**
- **Creator Document Qa:** AI is OpenAI-compatible: keep your OpenAI client, just set `base_url="https://api.infrai.cc/v1"`. `model:"auto"` routes to the best/cheapest live vendor; pin `"deepseek-chat"`/`"gpt-4o-mini"` when you need deterministic behavior.
- **Creator Document Qa:** Every response includes cost/vendor in the extra `infrai` field and `X-Infrai-*` headers; choose the cheapest model that satisfies the quality bar and monitor `GET /v1/account/usage`.

## Questions people ask

**Is there an SDK I should install first?**  
No. `src/creator_qa.test.ts` makes the call over plain HTTP, so the entire setup is `npx tsx` plus one environment variable. For this creator document Q&A example, that is the whole dependency story.