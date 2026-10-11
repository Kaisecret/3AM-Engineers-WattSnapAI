# Offline TinyBERT and online Gemini

WattSnap's household assistant now combines a real four-layer TinyBERT classifier with the existing keyword grammar. Validated local commands and supported saved-data questions still resolve immediately. Other questions use Gemini when connected; offline or failed cloud requests use TinyBERT to identify a read-only topic and the existing saved-data code to answer. A low-confidence or unknown classification uses the keyword fallback. Household edits still require confirmation.

The model has fourteen labels and approximately 14.35 million parameters, including its trained classification head. This is a text-understanding model. Bill-photo extraction and fresh provider information still require the online services.

## Run

The quantized model and tokenizer are checked in under `public/models/wattsnap-tinybert-v1`. Browser runtime files are generated from the locked npm dependencies; no runtime CDN is used.

```powershell
npm install
npm run dev
```

`predev` prepares the local runtime. For production:

```powershell
npm run build
npm run start
```

The production build creates `public/offline-ai.json` with the exact worker scripts, model, tokenizer and WASM assets. The service worker downloads those public files separately from the normal app shell. The model and runtime take roughly 29 MiB before browser scripts. Stay online during preparation; basic keyword chat remains usable if a download fails. Upgrades stage a separate cache and publish it only after every asset succeeds, preserving the previous complete model on failure. Only the current and previous complete generations are retained. Clearing browser storage removes offline preparation.

No new API key is needed for TinyBERT. Gemini keeps the existing server-side configuration. `.env.local` is unchanged.

## Train and evaluate

```powershell
python -m pip install -r scripts/tinybert/requirements.txt
python scripts/tinybert/train.py
npm run build
```

The script pins and verifies the upstream checkpoint, fine-tunes the classifier on 248 English/Tagalog examples, exports a quantized ONNX model, and evaluates 64 separate examples. Inspect `scripts/tinybert/evaluation.json` and `public/models/wattsnap-tinybert-v1/provenance.json` for the measured results. The evaluation examples also select the checkpoint: these figures are development smoke results, not an unbiased production accuracy estimate. More real household phrasing and a larger independent test set would improve confidence in language coverage.

## Verify

```powershell
npm run test:offline-ai
npm test
npx tsc --noEmit
$env:OFFLINE_BASE = 'http://127.0.0.1:3110'
node tests/e2e/tinybert-offline.cjs
```

The browser check needs the project's external Playwright installation, as do the other browser acceptance scripts. It prepares the real production assets, disconnects the network, closes the page, opens the assistant again, and checks inferred answers, exact-value calculations, confirmations, unknown rejection and absence of cloud/CDN requests. Feature tests cover Gemini routing/failure fallback, model timeouts, grammar priority and discarded replies after chat reset.
