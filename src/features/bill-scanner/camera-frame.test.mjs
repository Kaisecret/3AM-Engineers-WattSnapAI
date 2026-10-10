import assert from "node:assert/strict";
import test from "node:test";

test("camera image fits landscape, portrait and small viewfinders without cropping", async () => {
  const { cameraImageSize } = await import("./camera-frame.ts");
  assert.deepEqual(cameraImageSize(1920, 1080, 360, 500), { width: 360, height: 202.5 });
  assert.deepEqual(cameraImageSize(1080, 1920, 360, 500), { width: 281.25, height: 500 });
  assert.deepEqual(cameraImageSize(1920, 1080, 1000, 500), { width: 888.8888888888889, height: 500 });
  assert.deepEqual(cameraImageSize(0, 0, 360, 500), { width: 0, height: 0 });
});
