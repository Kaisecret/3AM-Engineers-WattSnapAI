"""Re-evaluate the checked-in quantized model without retraining it."""
import json
from pathlib import Path
import numpy as np
from onnxruntime import InferenceSession, SessionOptions
from transformers import AutoTokenizer


def evaluate(destination, dataset, metadata, root):
    labels = list(dataset)
    tokenizer = AutoTokenizer.from_pretrained(destination, local_files_only=True)
    options = SessionOptions()
    options.intra_op_num_threads = 4
    session = InferenceSession(str(destination / "onnx/model_quantized.onnx"), sess_options=options, providers=["CPUExecutionProvider"])
    results = []
    for label in labels:
        for text in dataset[label]["test"]:
            inputs = tokenizer(text, return_tensors="np", truncation=True, max_length=64)
            logits = session.run(None, dict(inputs))[0][0]
            probabilities = np.exp(logits - logits.max())
            probabilities /= probabilities.sum()
            order = np.argsort(probabilities)[::-1]
            predicted = labels[order[0]]
            confidence = float(probabilities[order[0]])
            margin = float(probabilities[order[0]] - probabilities[order[1]])
            accepted = predicted != "unknown" and confidence >= .9 and margin >= .2
            results.append({"text": text, "expected": label, "predicted": predicted, "confidence": round(confidence, 4), "margin": round(margin, 4), "accepted": accepted})
    report = metadata | {
        "evaluation_examples": len(results),
        "accuracy": sum(r["predicted"] == r["expected"] for r in results) / len(results),
        "min_confidence": .9, "min_margin": .2,
        "accepted": sum(r["accepted"] for r in results),
        "accepted_correct": sum(r["accepted"] and r["predicted"] == r["expected"] for r in results),
    }
    report.pop("results", None)
    (root / "scripts/tinybert/evaluation.json").write_text(json.dumps(report | {"results": results}, indent=2, ensure_ascii=False)+"\n", encoding="utf-8")
    (destination / "provenance.json").write_text(json.dumps(report, indent=2)+"\n", encoding="utf-8")
    print(json.dumps({key: value for key, value in report.items() if key != "limits"}, indent=2), flush=True)


if __name__ == "__main__":
    root = Path(__file__).resolve().parents[2]
    destination = root / "public/models/wattsnap-tinybert-v1"
    data = json.loads(Path(__file__).with_name("intents.json").read_text(encoding="utf-8"))
    metadata = json.loads((destination / "provenance.json").read_text(encoding="utf-8"))
    evaluate(destination, data, metadata, root)
