import assert from "node:assert/strict";
import test from "node:test";

test("camera image fits landscape, portrait and small viewfinders without cropping", async () => {
  const { cameraImageSize } = await import("./camera-frame.ts");
  assert.deepEqual(cameraImageSize(1920, 1080, 360, 500), { width: 360, height: 202.5 });
  assert.deepEqual(cameraImageSize(1080, 1920, 360, 500), { width: 281.25, height: 500 });
  assert.deepEqual(cameraImageSize(1920, 1080, 1000, 500), { width: 888.8888888888889, height: 500 });
  assert.deepEqual(cameraImageSize(0, 0, 360, 500), { width: 0, height: 0 });
});

test("receipt crop maps a letterboxed guide to original camera pixels", async () => {
  const { cameraGuideCrop } = await import("./camera-frame.ts");
  assert.deepEqual(cameraGuideCrop(1920,1080,360,500,{left:90,top:175,width:180,height:150}),{x:480,y:140,width:960,height:800});
  assert.deepEqual(cameraGuideCrop(1080,1920,360,500,{left:90,top:50,width:180,height:400}),{x:194,y:192,width:692,height:1536});
  assert.equal(cameraGuideCrop(0,0,360,500,{left:0,top:0,width:100,height:100}),null);
  assert.equal(cameraGuideCrop(1920,1080,360,500,{left:0,top:0,width:100,height:100}),null);
});
