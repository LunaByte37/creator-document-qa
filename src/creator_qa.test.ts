import test from "node:test";
import assert from "node:assert/strict";
import { answerQuestion } from "./creator_qa.ts";

test("request boundary requires a subscriber and a document", async () => {
  await assert.rejects(() => answerQuestion({ question: "Where is my file?", documentIds: [] }), /subscriberId|documentIds/);
});
