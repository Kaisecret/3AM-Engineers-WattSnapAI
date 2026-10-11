# WattSnap TinyBERT intent classifier v1

Derived from Huawei Noah's Ark Lab's `TinyBERT_General_4L_312D`, pinned to revision `34707a33cd59a94ecde241ac209bf35103691b43`. Upstream authors: Xiaoqi Jiao, Yichun Yin, Lifeng Shang, Xin Jiang, Xiao Chen, and Qun Liu. The upstream Apache 2.0 license is included as `LICENSE.txt`.

WattSnap modifies the pretrained weights by supervised fine-tuning for fourteen intent labels: budget, bill, history, comparison, appliances, estimate, tips, advisories, readiness, scenarios, rate, subsidy, due, and unknown. This model selects read-only topics; it cannot generate answers, infer missing measurements, or save household records.

Training uses 248 curated English/Tagalog examples in `scripts/tinybert/intents.json`, with a separate 64-example checkpoint-selection set. The reproducible training script exports an int8 quantized ONNX classifier. The exact parameter count, artifact size, source revision, dataset checksum and evaluation figures are recorded in `provenance.json`; per-example results are in `scripts/tinybert/evaluation.json`.

English TinyBERT pretraining limits multilingual generalization. The small curated selection set is not a production benchmark. Unsupported requests are represented by an unknown class; this does not guarantee rejection of every out-of-domain question. WattSnap requires probability >= 0.90 and a >= 0.20 lead over the next class before using a model prediction. Otherwise the existing keyword assistant remains available.

The deployed model, tokenizer, and runtime are hosted by WattSnap and cached on the user's device. Local inference sends the question to a browser worker; it does not call Hugging Face or a cloud inference service. Broader online questions use the separate Gemini server route.
