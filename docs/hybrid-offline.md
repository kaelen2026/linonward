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

The bundled artifact is the immutable recovery version. A later remote-update implementation must
download into a versioned staging directory, verify every file against the manifest, reject an
incompatible protocol major, and atomically promote the directory. It must retain the last verified
version and fall back to the application bundle when verification or startup fails.

Remote code updates are not implemented yet. Native stores must not execute a partially downloaded
directory or overwrite the bundled recovery version.

## Article cache

Article data uses stale-if-error behavior: a successful API response replaces the locale's cached
snapshot; a network or server failure may display the last successfully decoded snapshot and mark
it as offline. Invalid responses never replace valid cached content. This cache is the next
implementation slice and is independent of H5 asset versioning.
