"""Train a small intent classifier, export q8 ONNX, and evaluate held-out examples.

Run: python scripts/tinybert/train.py
The tiny curated evaluation set is a smoke test, not a production accuracy estimate.
"""
import copy
import hashlib
import json
import random
import tempfile
import urllib.request
from pathlib import Path

import numpy as np
import torch
from onnxruntime import InferenceSession, SessionOptions
from onnxruntime.quantization import QuantType, quantize_dynamic
from transformers import AutoTokenizer, BertForSequenceClassification

ROOT = Path(__file__).resolve().parents[2]
DEST = ROOT / "public/models/wattsnap-tinybert-v1"
BASE = "huawei-noah/TinyBERT_General_4L_312D"
REVISION = "34707a33cd59a94ecde241ac209bf35103691b43"
SEED = 42
random.seed(SEED)
np.random.seed(SEED)
torch.manual_seed(SEED)
torch.set_num_threads(4)
data_path = Path(__file__).with_name("intents.json")
data = json.loads(data_path.read_text(encoding="utf-8"))
labels = list(data)
train = [(text, i) for i, label in enumerate(labels) for text in data[label]["train"]]
evaluation = [(text, i) for i, label in enumerate(labels) for text in data[label]["test"]]
base_path = Path(tempfile.gettempdir()) / f"wattsnap-tinybert-base-{REVISION}"
base_path.mkdir(exist_ok=True)
for filename in ["config.json", "vocab.txt", "pytorch_model.bin"]:
    destination = base_path / filename
    if destination.exists():
        continue
    print(f"Downloading pinned base asset: {filename}", flush=True)
    url = f"https://huggingface.co/{BASE}/resolve/{REVISION}/{filename}?download=true&wattsnap=20261011"
    with urllib.request.urlopen(url, timeout=60) as source, destination.with_suffix(destination.suffix+".partial").open("wb") as target:
        while chunk := source.read(1024*1024):
            target.write(chunk)
    destination.with_suffix(destination.suffix+".partial").replace(destination)
expected_weights_sha256 = "84ac219f2fdab6e7f54fc6db4d7a9493708990b006d58f50cc1dceeef2a12f8a"
if hashlib.sha256((base_path / "pytorch_model.bin").read_bytes()).hexdigest() != expected_weights_sha256:
    raise RuntimeError("Pinned TinyBERT weight checksum mismatch")
tokenizer = AutoTokenizer.from_pretrained(base_path, local_files_only=True)
model = BertForSequenceClassification.from_pretrained(
    base_path, local_files_only=True, num_labels=len(labels),
    id2label=dict(enumerate(labels)), label2id={name: i for i, name in enumerate(labels)},
    attn_implementation="eager",
)
print(f"Training {sum(p.numel() for p in model.parameters()):,} parameters on {len(train)} examples", flush=True)
encoded = tokenizer([text for text, _ in train], padding=True, truncation=True, max_length=64, return_tensors="pt")
targets = torch.tensor([i for _, i in train])
test_inputs = tokenizer([text for text, _ in evaluation], padding=True, truncation=True, max_length=64, return_tensors="pt")
test_targets = torch.tensor([i for _, i in evaluation])
optimizer = torch.optim.AdamW([
    {"params": [p for name, p in model.named_parameters() if not name.startswith("classifier.")], "lr": 1e-4},
    {"params": model.classifier.parameters(), "lr": 1e-3},
], weight_decay=.01)
best_loss, best_state = float("inf"), None
for epoch in range(30):
    model.train()
    losses = []
    for indices in torch.randperm(len(train)).split(16):
        output = model(**{key: values[indices] for key, values in encoded.items()}, labels=targets[indices])
        output.loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), 1)
        optimizer.step()
        optimizer.zero_grad(set_to_none=True)
        losses.append(output.loss.item())
    model.eval()
    with torch.no_grad():
        output = model(**test_inputs, labels=test_targets)
    accuracy = (output.logits.argmax(-1) == test_targets).float().mean().item()
    if output.loss.item() < best_loss:
        best_loss = output.loss.item()
        best_state = copy.deepcopy(model.state_dict())
    print(f"Epoch {epoch+1}: train loss {np.mean(losses):.3f}, held-out loss {output.loss.item():.3f}, accuracy {accuracy:.1%}", flush=True)
model.load_state_dict(best_state)
model.eval()
model.save_pretrained(base_path.parent / "wattsnap-tinybert-trained-v1")
DEST.mkdir(parents=True, exist_ok=True)
(DEST / "onnx").mkdir(exist_ok=True)
model.config.save_pretrained(DEST)
tokenizer.save_pretrained(DEST)
# Browser tokenization must match the maximum sequence length used in training.
tokenizer_config_path = DEST / "tokenizer_config.json"
tokenizer_config = json.loads(tokenizer_config_path.read_text(encoding="utf-8"))
tokenizer_config["model_max_length"] = 64
tokenizer_config_path.write_text(json.dumps(tokenizer_config, indent=2)+"\n", encoding="utf-8")

class LogitsOnly(torch.nn.Module):
    def __init__(self, classifier):
        super().__init__()
        self.classifier = classifier

    def forward(self, input_ids, attention_mask, token_type_ids):
        return self.classifier(input_ids=input_ids, attention_mask=attention_mask, token_type_ids=token_type_ids).logits

with tempfile.TemporaryDirectory(prefix="wattsnap-tinybert-") as temporary:
    full = Path(temporary) / "model.onnx"
    sample = tokenizer("What is my budget?", return_tensors="pt")
    torch.onnx.export(
        LogitsOnly(model), tuple(sample[key] for key in ["input_ids", "attention_mask", "token_type_ids"]), str(full),
        input_names=["input_ids", "attention_mask", "token_type_ids"], output_names=["logits"],
        dynamic_axes={key: {0: "batch", 1: "sequence"} for key in sample} | {"logits": {0: "batch"}},
        opset_version=17, dynamo=False,
    )
    quantized = DEST / "onnx/model_quantized.onnx"
    quantize_dynamic(str(full), str(quantized), weight_type=QuantType.QInt8, per_channel=True)

options = SessionOptions()
options.intra_op_num_threads = 4
session = InferenceSession(str(quantized), sess_options=options, providers=["CPUExecutionProvider"])
results = []
for text, target in evaluation:
    inputs = tokenizer(text, return_tensors="np", truncation=True, max_length=64)
    logits = session.run(None, dict(inputs))[0][0]
    probabilities = np.exp(logits - logits.max())
    probabilities /= probabilities.sum()
    order = np.argsort(probabilities)[::-1]
    predicted = labels[order[0]]
    confidence = float(probabilities[order[0]])
    margin = float(probabilities[order[0]] - probabilities[order[1]])
    accepted = predicted != "unknown" and confidence >= .9 and margin >= .2
    results.append({"text": text, "expected": labels[target], "predicted": predicted, "confidence": round(confidence, 4), "accepted": accepted})
report = {
    "base_model": BASE, "revision": REVISION, "seed": SEED,
    "dataset_sha256": hashlib.sha256(data_path.read_bytes()).hexdigest(),
    "training_examples": len(train), "evaluation_examples": len(results),
    "min_confidence": .9, "min_margin": .2,
    "accuracy": sum(r["predicted"] == r["expected"] for r in results) / len(results),
    "accepted": sum(r["accepted"] for r in results),
    "accepted_correct": sum(r["accepted"] and r["predicted"] == r["expected"] for r in results),
    "parameters": sum(p.numel() for p in model.parameters()), "onnx_bytes": quantized.stat().st_size,
    "limits": "Small curated held-out set used for checkpoint selection; not an unbiased production benchmark. English-pretrained backbone; Tagalog coverage limited to intent examples. No generative answers or record mutations.",
    "results": results,
}
(ROOT / "scripts/tinybert/evaluation.json").write_text(json.dumps(report, indent=2, ensure_ascii=False)+"\n", encoding="utf-8")
(DEST / "provenance.json").write_text(json.dumps({key: value for key, value in report.items() if key != "results"}, indent=2)+"\n", encoding="utf-8")
print(json.dumps({key: value for key, value in report.items() if key not in ["results", "limits"]}, indent=2), flush=True)
