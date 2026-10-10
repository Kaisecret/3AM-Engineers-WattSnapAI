# Scanner first and receipt reading

Snap AI and Scan bill both lead to `/bills/new`. Every visit starts with the scanner. Stored unfinished fields are offered through Resume draft and never automatically open manual entry. Manual entry remains an explicit choice.

The visual focus is the complete camera image on the existing dark WattSnap surface, with cyan corner guides and simple capture controls. Bill and narrow receipt guides adapt to the available image area. Camera preview uses contain, so all captured pixels remain visible. Captured and uploaded originals use contain too. Camera capture waits until a video frame is ready and requests a high resolution rear camera. Decorations move out of the live text area; the scan beam appears only while reading, with reduced motion respected.

Capture/upload enters Gemini reading, then editable review. Failed or empty readings show the original and explicit retry, retake/upload and manual actions. Cancellation and identity changes prevent stale reads from entering review. No scan saves a bill until the person confirms it.

Preserve small printed text during upload within the existing request size limit. Request high image resolution from Gemini. Keep provider hints subordinate to the printed name. Do not fill explicitly unreadable fields from arithmetic, and validate numeric/date output and contradictions. Keep known values editable and flag missing or inconsistent values.

Verification covers restored drafts, frame geometry, camera readiness, successful upload/capture, empty and failed readings, cancellation, manual entry, and receipt normalization. Browser tests use an isolated harness with the real scanner component and browser APIs; external AI responses are controlled for deterministic flow tests. A synthetic receipt can additionally check the configured live Gemini reader without using household data.
