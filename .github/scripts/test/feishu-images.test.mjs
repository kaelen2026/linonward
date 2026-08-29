import assert from "node:assert/strict";
import test from "node:test";

import { extensionForContentType, parseImageKeys } from "../feishu-images.mjs";

test("parses the bounded image-key workflow input", () => {
  assert.deepEqual(parseImageKeys('["img_first","img_second"]'), ["img_first", "img_second"]);
});

test("rejects malformed image-key workflow input", () => {
  assert.throws(() => parseImageKeys('{"key":"img_first"}'), /JSON array/);
  assert.throws(() => parseImageKeys(JSON.stringify(Array(9).fill("img"))), /at most 8/);
});

test("maps supported image content types to safe extensions", () => {
  assert.equal(extensionForContentType("image/jpeg"), ".jpg");
  assert.equal(extensionForContentType("image/png; charset=binary"), ".png");
  assert.equal(extensionForContentType("application/octet-stream"), ".img");
});
