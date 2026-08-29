# LinOnward H5 article reader

Vite + React article surface intended for an iOS/Android WebView. The production page waits for
the native client to provide article data. Open `/?demo=1` during local development to render the
built-in fixture.

## Commands

```bash
pnpm --filter @linonward/h5 dev
pnpm --filter @linonward/h5 test
pnpm --filter @linonward/h5 build
```

The production build is emitted to `dist/` and uses relative asset paths, so it can be bundled in
a native client or hosted below any URL prefix.

## Bridge protocol

Every message is an object with `{ type, payload }`. The H5 page sends messages through the first
available transport:

1. iOS: `window.webkit.messageHandlers.linonward.postMessage(message)`
2. Android: `window.LinOnwardBridge.postMessage(JSON.stringify(message))`
3. React Native: `window.ReactNativeWebView.postMessage(JSON.stringify(message))`
4. Browser fallback: disabled unless `VITE_PARENT_ORIGIN` is an exact HTTP(S) origin

Native code sends messages by invoking `window.LinOnward.receive(messageOrJson)`. A configured
parent web page can instead post `{ source: "linonward-native", message }` to the frame; both its
`event.source` and `event.origin` must match.

### Handshake and compatibility

The H5 page starts with `bridge:hello`, carrying protocol `{ major, minor }` and its capability
list. Native replies with `bridge:welcome`, a cryptographically random `sessionId`, the negotiated
minor version, and the capability intersection. H5 then sends `reader:ready`; only then should
native send the article.

- A different major version is incompatible and must stop the flow.
- A newer minor version is compatible through the shared capability intersection.
- Every message after `bridge:hello` carries the current `sessionId`; stale or cross-page messages
  are rejected.
- Unknown types, malformed payloads, and messages over 1 MB are rejected without dispatch.

### Native to H5

- `bridge:welcome` — negotiated protocol, capabilities, and the new page session
- `article:set` — `{ article, settings? }`, authenticated with the page session
- `reader:settings` — `{ theme?, fontScale?, locale? }`, authenticated with the page session

The minimum article shape is:

```json
{
  "id": "article-id",
  "title": "Article title",
  "contentHtml": "<p>Sanitized HTML content</p>"
}
```

Optional article fields are `author`, `publishedAt`, `readingMinutes`, and `cover` (`url`, `alt`,
`caption?`). Themes are `light`, `dark`, or `system`; font scale is clamped to `0.85...1.3`.

### H5 to native

- `bridge:hello` — supported protocol and capabilities
- `reader:ready` — the authenticated bridge is ready and native can send `article:set`
- `reader:height` — rendered content height changed
- `reader:error` — invalid native data was received
- `article:link` — the user tapped a link; native owns navigation
- `article:image` — the user tapped an image; native can open an image viewer

Article HTML is sanitized in the H5 process. Inline styles, scripts, event handlers, iframes, and
unknown tags are removed before React renders it.

The production HTML carries a restrictive CSP. Development adds only the localhost Vite HMR
WebSocket; production `connect-src` is reduced to the page's own origin.
