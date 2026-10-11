# TinyBERT Offline Assistant Implementation Plan

> Execute inline in the current workspace as requested by the user. Preserve existing unrelated edits.

**Goal:** Add an actual local TinyBERT classifier to the existing offline assistant and keep Gemini online.

**Architecture:** Existing grammar resolves commands first. A worker loads a quantized locally hosted classifier and maps confident read-only intents to the existing saved-record resolver. The service worker saves all inference dependencies and tracks language readiness separately.

**Tech stack:** Next.js 15, React 19, TypeScript, Transformers.js 4.3.1, PyTorch/Transformers for training, ONNX Runtime quantization.

- [x] Add failing Node tests for confidence rejection, keyword precedence, preserved original values, inference failure, and stale work cancellation.
- [x] Install the browser inference library and training dependencies. Create a versioned English/Tagalog intent dataset, reproducible training/export script, quantized classifier, tokenizer, model provenance and evaluation results.
- [x] Implement the worker, timeout-safe worker client, and deterministic hybrid reply resolver. Configure all model/runtime paths locally and disable remote assets.
- [x] Integrate asynchronous local fallback into `use-chat.ts`, preserving Gemini behavior and reset/account protection. Show model preparation status without preventing keyword chat.
- [x] Extend `public/sw.js` with separate, validated public-AI preparation and offline fetching; add tests proving readiness requires every AI asset and private responses remain uncached.
- [x] Run unit tests, TypeScript/production build, real model smoke tests, and a browser test with the network disconnected after saving the assets.
- [x] Review the final diff and document offline preparation, training, evaluation limits, and validation results.

Validation: `npm test` 297/297, `npm run test:offline-ai` 34/34, production build, real quantized model evaluation, cold disconnected Chrome check, zero npm audit findings, and a read-only independent review. The review's interrupted-update finding was fixed with staged cache generations and a failing-then-passing upgrade/retry regression.
