import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const { clip, downloadFacebookImages, facebookImageUrl, fetchFacebookPosts, readFacebookPosts } = await import("./facebook-posts.ts");
// A real answer from the actor for ANTECO's page (October 2026), trimmed to the fields the app
// reads: three posts, captions cut to 400 characters, image links without their signed query.
// Comments, authors and reaction counts were removed.
const fixture = JSON.parse(await readFile(new URL("./facebook-posts.fixture.json", import.meta.url), "utf8"));

test("a real answer from the actor becomes posts, newest first", () => {
  const posts = readFacebookPosts(fixture);
  assert.equal(posts.length, 3);
  assert.deepEqual(posts.map(post => post.postedAt), ["2026-10-11T07:25:19.000Z", "2026-10-10T11:21:44.000Z", "2026-10-09T11:46:25.000Z"]);
  const [album, reminder, advisory] = posts;
  for (const post of posts) {
    assert.match(post.id, /^\d{10,}$/);
    assert.match(post.url, /^https:\/\/www\.facebook\.com\/antecoPH\/posts\//);
    assert.ok(post.imageUrls.every(link => new URL(link).hostname.endsWith(".fbcdn.net")));
  }
  // An album: one wrapper entry without a picture, then five photos given as `image`.
  assert.equal(album.imageCount, 6);
  assert.equal(album.imageUrls.length, 5);
  assert.deepEqual(album.imageUrls, fixture[0].media.filter(part => part.image).map(part => part.image.uri));
  // The actor's "ocrText" is a description, not the printed text. It is kept once, as a hint only.
  assert.equal(album.imageText, "May be an image of text");
  // A text-only post.
  assert.match(reminder.text, /^Reminder: NGCP Scheduled Power Interruption/);
  assert.deepEqual([reminder.imageCount, reminder.imageUrls, reminder.imageText], [0, [], ""]);
  // A single photo: the full picture is preferred over its thumbnail.
  assert.deepEqual(advisory.imageUrls, [fixture[2].media[0].photo_image.uri]);
  assert.equal(advisory.imageCount, 1);
  // ANTECO writes the heading in styled letters; the caption is kept exactly as posted.
  assert.match(advisory.text.normalize("NFKC"), /^Advisory \|\| UNSCHEDULED POWER INTERRUPTION/);
  assert.doesNotMatch(advisory.text, /UNSCHEDULED/);
});

test("items in other shapes are still read, and unusable items are dropped", () => {
  const usable = { postId: "1", url: "https://www.facebook.com/antecoPH/posts/1", time: "2026-10-10T01:15:00.000Z", text: "First" };
  const posts = readFacebookPosts([
    usable,
    // Identified by facebookId, linked by topLevelUrl and dated by a timestamp in seconds.
    { facebookId: "2", topLevelUrl: "https://www.facebook.com/antecoPH/posts/2", timestamp: 1791594000, text: "Second", media: [{ thumbnail: "https://images.example.org/not-facebook.jpg" }] },
    { ...usable, text: "The same post returned twice." },
    { url: "https://www.facebook.com/antecoPH/posts/3", time: "2026-10-09T01:00:00.000Z", text: "No post id." },
    { postId: "4", url: "https://facebook.com.example.org/antecoPH/posts/4", time: "2026-10-09T02:00:00.000Z", text: "Not on facebook.com." },
    { postId: "5", url: "https://www.facebook.com/antecoPH/posts/5", text: "No time." },
    null, "text", 7,
  ]);
  assert.deepEqual(posts.map(post => [post.id, post.text]), [["1", "First"], ["2", "Second"]]);
  assert.equal(posts[1].postedAt, new Date(1791594000 * 1000).toISOString());
  // The image exists but its link is not on fbcdn.net: counted, never downloaded.
  assert.deepEqual([posts[1].imageCount, posts[1].imageUrls], [1, []]);
});

test("text is never cut in the middle of a character", () => {
  const styled = "𝗣𝗢𝗪𝗘𝗥"; // five letters, ten code units
  assert.equal(clip(styled, 4), "𝗣𝗢");
  assert.equal(clip(styled, 5), "𝗣𝗢", "half of the third letter is dropped");
  assert.equal(clip("POWER", 3), "POW");
  const [post] = readFacebookPosts([{ postId: "1", url: "https://www.facebook.com/antecoPH/posts/1", time: "2026-10-10T01:15:00.000Z", text: `x${styled.repeat(4000)}` }]);
  assert.ok(post.text.length <= 8000);
  // A string that ends on half a character cannot be stored as JSON text in Postgres.
  assert.doesNotThrow(() => encodeURIComponent(post.text));
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
