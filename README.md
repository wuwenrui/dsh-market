# Managed Lawyer Market

This is the managed legal-product fork of [dsh-market](https://github.com/dsh-market/dsh-market), based on upstream 1.46.1. The upstream MIT license and attribution are retained. The package is `@lawyer-dsh/market`; it is not a standalone replacement to install into an arbitrary web or Desktop profile.

## Product behavior

Discovery has two tiers, and **this product decides what is open**:

**One signed catalog is the single distribution point**, and the client reads only that:

- **Owned**: releases this product publishes and signs with Ed25519, verified by digest and installed offline.
- **Community**: the community catalog (`awesome-dsh-plugin`) is read at **publish time only**, to resolve the entries this product opened into our own signed catalog. Clients never contact the community site at runtime, so its availability cannot affect users.

Both tiers live in one `catalog.json`, so opening or closing a community entry, or shipping a new owned release, is a catalog publish — users refresh and get it, with no product release.

Both tiers share these rules:

- Installation and update accept only a plugin ID and exact version, rechecking authorization immediately before committing. Community entries are pinned to the version we reviewed, never the community's latest.
- Identity, version, digest, archive safety and host compatibility are checked.
- **A community bundle may only insert its own rows.** It cannot replace product rows such as `llm-pi-ai`, `agent-presets` or `lawyer-platform`, mount another package, or create a group.
- Lifecycle scripts never run. Community plugins may declare dependencies; we never run their build scripts.
- The private, pinned pnpm prepares a staging profile offline. A separate **real Harness** starts that profile and must report readiness before the active directory switches. Active agents block changes; new turns are held out during mutation. Restart is required after a successful switch.
- Failed changes preserve the active profile. A journal supports interrupted-switch recovery. Uninstall removes only recorded business bundles; infrastructure and legacy update/restore/source-switch endpoints cannot be used as bypasses.
- The browser offers fixed-site credentials/model selection and the approved legal capabilities. Public comments, GitHub acceleration, arbitrary sources and market self-removal are not product controls.

Opening a community entry is a change to the product's community listing plus a catalog publish (see `../lawyer-harness/docs/managed-product.md`); no market code changes and no user upgrade. Community entries are third-party executable code: review and version pinning are our responsibility. This edition does not implement per-account commercial entitlements or isolate malicious same-process code.

## Development and verification

Use npm for this repository. The paired workspace contains `../deepseek-harness` and `../lawyer-harness`.

```sh
npm ci --ignore-scripts
npm run typecheck
npm run build
npm test -- --maxWorkers=4
node ../lawyer-harness/tests/managed/product.e2e.mjs
```

The last command requires built Harness artifacts and a signed test publication from the companion project's publisher. It uses real DSH, pnpm, plugin tarballs and Chromium; only remote HTTP services are fixtures. The source retains upstream low-level helpers and their regression tests, but the package entry mounts only managed routes. The upstream third-party Desktop adapter and community `test:web` scaffold do not define this fork's managed-product acceptance.

See [the product guide](../lawyer-harness/docs/managed-product.md) for preparation, launch and central publication. The legal product's launcher owns installation; do not use the upstream `dsh plugin add dshmarket` instructions for this fork.
