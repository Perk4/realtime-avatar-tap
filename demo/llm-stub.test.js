import assert from "node:assert/strict";
import { test } from "node:test";
import { stubLlm } from "./llm-stub.js";

test("LLM stub stays off and ignores secrets in the environment", () => {
  const previous = process.env.OPENAI_API_KEY;
  process.env.OPENAI_API_KEY = "should-not-be-read";
  try {
    const result = stubLlm("hello");
    assert.deepEqual(result, {
      enabled: false,
      reason: "v1 demo does not call an LLM",
      text: null,
    });
  } finally {
    if (previous === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = previous;
    }
  }
});
