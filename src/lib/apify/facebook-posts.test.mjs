import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const { downloadFacebookImages, facebookImageUrl, fetchFacebookPosts, readFacebookPosts } = await import("./facebook-posts.ts");
// Written from the actor's documented output fields, with invented values. Replace it with a
// trimmed real response once the actor has been run with a real token (docs/13).
const fixture = JSON.parse(await readFile(new URL("./facebook-posts.fixture.json", import.meta.url), "utf8"));

test("actor items become posts, newest first, and unusable items are dropped", () => {
  const posts = readFacebookPosts(fixture);
  assert.deepEqual(posts.map(post => post.id), ["1000000000000001", "1000000000000002"]);
  const [advisory, notice] = posts;
  assert.equal(advisory.url, "https://www.facebook.com/antecoPH/posts/pfbid0example1");
  assert.equal(advisory.postedAt, "2026-10-10T01:15:00.000Z");
  assert.match(advisory.text, /^SCHEDULED POWER INTERRUPTION/);
  // The full-size image is preferred over its thumbnail, and an image that is not on fbcdn.net is left out.
  assert.deepEqual(advisory.imageUrls, ["https://scontent.fmnl1-1.fna.fbcdn.net/v/t39.30808-6/sample-full.jpg"]);
  assert.match(advisory.imageText, /Affected: Brgy\. Sample/);
  // Both images are counted, including the one whose link cannot be used.
  assert.equal(advisory.imageCount, 2);
  assert.equal(notice.imageCount, 0);
  // A post identified by facebookId, linked by topLevelUrl and dated by a timestamp in seconds.
  assert.equal(notice.url, "https://www.facebook.com/antecoPH/posts/pfbid0example2");
  assert.equal(notice.postedAt, new Date(1791594000 * 1000).toISOString());
  assert.deepEqual(notice.imageUrls, []);
  assert.equal(notice.imageText, "");
});

test("anything that is not a list of items gives no posts", () => {
  for (const value of [null, undefined, "error", { error: "failed" }, [null, 3, "x"]]) assert.deepEqual(readFacebookPosts(value), []);
});

test("only https images on fbcdn.net are accepted", () => {
  assert.equal(facebookImageUrl("https://scontent.xx.fbcdn.net/a.jpg"), "https://scontent.xx.fbcdn.net/a.jpg");
  for (const bad of ["http://scontent.xx.fbcdn.net/a.jpg", "https://fbcdn.net.example.org/a.jpg", "https://user:pass@scontent.xx.fbcdn.net/a.jpg", "https://169.254.169.254/latest", "file:///etc/passwd", "", null]) {
    assert.equal(facebookImageUrl(bad), null, String(bad));
  }
});

test("a fetch sends the token in a header, asks only for the wanted range, and reports a full page", async t => {
  const original = globalThis.fetch, token = process.env.APIFY_API_TOKEN;
  t.after(() => { globalThis.fetch = original; if (token === undefined) delete process.env.APIFY_API_TOKEN; else process.env.APIFY_API_TOKEN = token; });
  const query = { pageUrl: "https://www.facebook.com/antecoPH", newerThan: "2026-10-09T00:00:00.000Z", olderThan: "2026-10-10T00:00:00.000Z", limit: 2, timeoutMs: 60000 };

  delete process.env.APIFY_API_TOKEN;
  await assert.rejects(fetchFacebookPosts(query), /APIFY_API_TOKEN is not configured/);

  process.env.APIFY_API_TOKEN = "test-token-value";
  let seen;
  globalThis.fetch = async (url, init) => { seen = { url: String(url), init }; return Response.json(fixture.slice(0, 2), { status: 201 }); };
  const page = await fetchFacebookPosts(query);
  assert.equal(page.full, true);
  assert.equal(page.posts.length, 2);
  assert.ok(!seen.url.includes("test-token-value"), "the token is never in the URL");
  assert.equal(seen.init.headers.Authorization, "Bearer test-token-value");
  assert.deepEqual(JSON.parse(seen.init.body), { startUrls: [{ url: query.pageUrl }], resultsLimit: 2, onlyPostsNewerThan: query.newerThan, onlyPostsOlderThan: query.olderThan });

  globalThis.fetch = async () => Response.json(fixture.slice(0, 1), { status: 201 });
  assert.equal((await fetchFacebookPosts(query)).full, false);

  globalThis.fetch = async () => new Response("token test-token-value rejected", { status: 401 });
  await assert.rejects(fetchFacebookPosts(query), error => { assert.equal(error.message, "Apify returned status 401."); return true; });
});

test("images are downloaded only from fbcdn.net, without following redirects, and only if they are small images", async t => {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  const asked = [];
  let pulled = 0, cancelled = false;
  const image = (type, bytes, headers = {}) => new Response(new Uint8Array(bytes), { headers: { "content-type": type, ...headers } });
  globalThis.fetch = async (url, init) => {
    asked.push([String(url), init.redirect]);
    if (String(url).endsWith("ok.jpg")) return image("image/jpeg; charset=binary", 3);
    if (String(url).endsWith("ok.png")) return image("image/png", 2);
    if (String(url).endsWith("page.html")) return image("text/html", 10);
    if (String(url).endsWith("huge.jpg")) return image("image/jpeg", 4 * 1024 * 1024 + 1);
    if (String(url).endsWith("claims-huge.jpg")) return image("image/jpeg", 3, { "content-length": String(50 * 1024 * 1024) });
    if (String(url).endsWith("empty.jpg")) return image("image/jpeg", 0);
    // No declared length and no end: reading must stop at the limit instead of buffering it all.
    if (String(url).endsWith("endless.jpg")) return new Response(new ReadableStream({ pull(controller) { pulled += 1; controller.enqueue(new Uint8Array(1024 * 1024)); }, cancel() { cancelled = true; } }), { headers: { "content-type": "image/jpeg" } });
    if (String(url).endsWith("gone.jpg")) return new Response("expired", { status: 403, headers: { "content-type": "image/jpeg" } });
    throw new TypeError("fetch failed");
  };
  const host = "https://scontent.xx.fbcdn.net/";
  const images = await downloadFacebookImages([`${host}ok.jpg`, "https://example.org/ok.jpg", "http://scontent.xx.fbcdn.net/ok.jpg", `${host}page.html`, `${host}huge.jpg`, `${host}claims-huge.jpg`, `${host}empty.jpg`, `${host}endless.jpg`, `${host}gone.jpg`, `${host}unreachable.jpg`, `${host}ok.png`]);
  assert.deepEqual(images, [{ mimeType: "image/jpeg", data: "AAAA" }, { mimeType: "image/png", data: "AAA=" }]);
  assert.ok(asked.every(([url, redirect]) => url.startsWith(host) && redirect === "error"), "nothing outside fbcdn.net was requested, and redirects are refused");
  assert.equal(asked.length, 9);
  assert.ok(cancelled && pulled <= 8, `an endless image is abandoned at the limit (read ${pulled} MB)`);
  assert.deepEqual(await downloadFacebookImages([`${host}gone.jpg`]), [], "expired links give no images");
});
