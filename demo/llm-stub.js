export function stubLlm(_prompt) {
  return {
    enabled: false,
    reason: "v1 demo does not call an LLM",
    text: null,
  };
}
