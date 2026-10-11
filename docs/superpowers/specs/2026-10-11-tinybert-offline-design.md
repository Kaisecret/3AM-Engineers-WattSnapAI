# TinyBERT offline assistant

Approved scope: implement the hybrid assistant proposed in chat on October 11, 2026.

Use Huawei TinyBERT General 4L 312D (14.5M parameters), trained for WattSnap read-only intents and exported as a quantized ONNX classifier. Run it in a browser worker with locally hosted tokenizer and WASM assets. Exact commands and numbers continue through the existing validated grammar; the classifier never writes household records or generates numerical values.

Recognized local commands retain priority. Other online questions go to the existing server Gemini endpoint. Offline questions and failed Gemini requests use TinyBERT to resolve wording into a known topic, followed by saved-data calculations and templates. Unknown or low-confidence classifications ask for a clearer question. Preserve the original question when resolving dates, units and amounts. Resetting chat or changing accounts must discard late asynchronous replies.

The service worker prepares the public model assets separately from the normal app shell, reports language-model readiness, and caches only explicitly listed public files. Failed model preparation must leave the existing keyword assistant usable. No Hugging Face or WASM CDN requests run in the deployed app, and household text remains on device during local inference.

Validation: confidence/unknown handling, original-value preservation, grammar precedence, reset cancellation, Gemini routing/fallback, service-worker asset preparation, real model predictions, disconnected cold page reload and production build. Include reproducible training/export commands and an evaluation report; disclose that English TinyBERT has limited multilingual pretraining even with Tagalog intent examples.
