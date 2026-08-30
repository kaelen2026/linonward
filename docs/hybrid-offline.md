# Hybrid offline delivery

The native readers ship the H5 production build inside each application package. This guarantees
that the reader shell, styles, and bridge bootstrap work without a network connection. Article
content is a separate cache layer and must never be mixed into the executable bundle.

## Bundle contract

`pnpm hybrid:sync` builds `apps/h5` once, creates `hybrid-manifest.json`, and copies the exact same
directory to iOS, Android, and HarmonyOS. `pnpm hybrid:check` rebuilds it and fails when any native
copy differs.

The manifest contains:

- schema version and `index.html` entrypoint;
- negotiated Bridge protocol major/minor;
- SHA-256, byte size, and relative path for every executable asset;
- an `artifactVersion` derived deterministically from the sorted asset records.

Absolute paths and parent traversal are invalid. The manifest intentionally excludes itself from
the artifact hash. There is no build timestamp, so identical inputs produce identical packages.

## Runtime selection

The bundled artifact remains the immutable recovery version. At startup, each native host may read
an HTTPS channel document, apply its minimum-app-version and deterministic rollout percentage, then
download the referenced immutable release. Every file is size-checked and SHA-256 verified before
the staging directory is promoted and the active-version pointer is atomically replaced.

An invalid channel, incompatible bridge major, interrupted download, or corrupt asset leaves the
previous active version untouched. A corrupt cached release is removed and downloaded again. If a
cached WebView cannot start, the active pointer is withdrawn and the reader reloads the application
bundle. Channel and manifest responses are capped at 256 KB; a release is capped at 512 files and
50 MB.

Configure the same channel URL in the platform release build settings:

- iOS: `LINONWARD_HYBRID_CHANNEL_URL`;
- Android: `linonward.hybridChannelUrl.release`;
- HarmonyOS: `HYBRID_CHANNEL_URL` in `entry/build-profile.json5`.

## Article cache

Article data uses stale-if-error behavior: a successful API response replaces the locale's cached
snapshot; a network or server failure may display the last successfully decoded snapshot. Invalid
responses never replace valid cached content. This cache is implemented with app-private storage
on iOS, Android, and HarmonyOS and is independent of H5 asset versioning.

## Verification matrix

| Contract | iOS | Android | HarmonyOS | React Native |
| --- | --- | --- | --- | --- |
| Bundled immutable H5 recovery artifact | Implemented | Implemented | Implemented | Planned |
| Deterministic manifest parity check | Implemented | Implemented | Implemented | Planned |
| Verified remote release activation | Simulator tested | JVM tested | Host tested | Planned |
| Locale article snapshot | Implemented | Implemented | Implemented | Planned |
| Stale-if-error article fallback | Unit tested | Unit tested | Host tested | Planned |
| Bridge handshake and session binding | Simulator tested | JVM tested | Host tested | H5 transport unit tested |
| Airplane-mode launch and cached reopen | Simulator/device required | Emulator/device required | Emulator/device required | Device required |

The native device rows remain release blockers. A build or host test proves packaging and policy,
but it does not prove WebView startup, process recreation, or platform storage behavior on a real
runtime.

## React Native extension boundary

The H5 side already supports `window.ReactNativeWebView.postMessage` and applies the same protocol
negotiation, capability intersection, message-size limit, and session binding as the three native
hosts. A future React Native shell should therefore be another host adapter, not a fork of the H5
reader or bridge contract.

That shell still owns four platform responsibilities before it can be called Preview:

- package the checked-in H5 artifact and verify the shared manifest during CI;
- expose only the bridge message channel and route native-to-H5 messages through
  `window.LinOnward.receive`;
- persist decoded article snapshots in app-private storage with atomic replacement;
- pass iOS and Android device tests for bundled launch, cached reopen, external navigation, and
  incompatible protocol rejection.

Do not introduce a React Native app merely as a second wrapper around the existing iOS and Android
products. It becomes worthwhile when shared RN-owned product screens offset the duplicate release,
accessibility, performance, and native-module verification surface.
