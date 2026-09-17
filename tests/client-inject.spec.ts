/**
 * What the market's client declares it needs, against what it touches.
 *
 * `dsh.client.inject` is a HARD gate: the host holds the client entry back
 * until every listed seam exists. A seam that is listed but never used is
 * therefore not free — it is a version of the host the market refuses to
 * run on, bought for nothing.
 *
 * That is not hypothetical. @MarchLiu found (#554) that on dsh 0.1.2-rc.1
 * the market's presence silently stopped `dsh-context` from registering its
 * commands, and traced it by binary search to the market's entry alone. The
 * market listed `@deepseek-ai/dsh-client-runtime` — a seam that release
 * ships incompletely, and that had already hard-failed another plugin's
 * boot — and `@deepseek-ai/dsh-client-connection`, and used NEITHER. Both
 * had been in the manifest since 0.1.0 and never removed when the code that
 * might have needed them was not written.
 *
 * This test is the thing that was missing: a declaration and its use, kept
 * next to each other. It reads the client source rather than a hand-written
 * list, so adding `ctx.something` without declaring its seam fails too.
 *
 * Managed adaptation. This fork admits client seams in the ENTRY
 * (`export const inject` in src/client/index.ts) and declares no
 * `dsh.client.inject` in package.json at all: a package-level list is a gate
 * the host applies before the entry is even loaded, and the managed product
 * decides admission itself. Upstream's two directions are therefore read
 * from the entry's own declaration, and the third assertion — the one about
 * a nested, optional settings seam — is inverted: the managed client has no
 * nested `settingsScope` injection on purpose, so that a host without the
 * plugin-configuration page loses only that page, not the market.
 */

import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const CLIENT_ENTRY = resolve('src/client/index.ts')

/** The host services the client entry actually reaches for. */
function servicesUsed(): Set<string> {
  const source = readFileSync(CLIENT_ENTRY, 'utf8')
  const used = new Set<string>()
  // `ctx.locale`, `ctx.theme`, `ctx.slots`, … — the property access IS the
  // dependency, which is why this is read from the source and not declared.
  for (const match of source.matchAll(/\bctx\.([a-zA-Z][a-zA-Z0-9]*)/g)) used.add(match[1]!)
  // Nested injects name their service as a string instead.
  for (const match of source.matchAll(/\.inject\(\[([^\]]*)\]/g)) {
    for (const name of match[1]!.split(',')) {
      const clean = name.trim().replace(/^['"`]|['"`]$/g, '')
      if (clean !== '') used.add(clean)
    }
  }
  return used
}

/**
 * Services the managed entry declares at module level. This fork has no
 * package-level `dsh.client.inject`; the entry's own `export const inject`
 * is the whole admission list.
 */
function declaredSeams(): string[] {
  const source = readFileSync(CLIENT_ENTRY, 'utf8')
  const list = [...source.matchAll(/export const inject = \[([^\]]*)\]/g)][0]?.[1] ?? ''
  return list
    .split(',')
    .map(value => value.trim().replace(/^['"`]|['"`]$/g, ''))
    .filter(Boolean)
}

/**
 * Declared services the entry never reaches for, justified by the host
 * contract it is applied with rather than by a property access.
 *
 * `theme` is the standing case: `MarketClientContext` declares the theme
 * service the product shell guarantees and hands the entry, while the two
 * sections the entry mounts take the translator alone. It stays a manual
 * list — adding a seam here is a statement that the product, not this
 * entry, requires it, and that statement should be reviewed rather than
 * derived from a type.
 */
const HOST_CONTRACT_ONLY = new Set(['theme'])

const packageJson = JSON.parse(readFileSync(resolve('package.json'), 'utf8')) as {
  dsh?: { client?: { platform?: string; inject?: unknown } }
}

describe('managed client seam admission', () => {
  it('does not use upstream package-level dsh.client.inject gating', () => {
    // The managed entry admits its own seams; a package-level list would
    // gate the market's own page on seams this product does not consume.
    expect(packageJson.dsh?.client?.inject).toBeUndefined()
    expect(packageJson.dsh?.client).toMatchObject({ platform: 'web' })
  })

  it('declares only seams the client entry actually uses (#554)', () => {
    const used = servicesUsed()
    const unused = declaredSeams().filter(service => !used.has(service) && !HOST_CONTRACT_ONLY.has(service))
    // Every entry here is a host version the market will not start on, in
    // exchange for nothing.
    expect(unused).toEqual([])
  })

  it('declares every seam the client entry depends on at module level', () => {
    // The other direction: reaching for `ctx.locale` without declaring the
    // locale seam means the entry runs before the service exists.
    const used = servicesUsed()
    const declared = new Set(declaredSeams())
    // `effect` and `on` are cordis's own, not seams; `settingsScope` is the
    // optional settings seam this managed client deliberately never injects.
    const ownedByCordis = new Set(['effect', 'on', 'settingsScope'])
    const missing = [...used].filter(service => !declared.has(service) && !ownedByCordis.has(service))
    expect(missing).toEqual([])
  })

  it('does not gate the whole entry on an optional settings service', () => {
    // The managed client renders the product's own model and market
    // sections. It must not acquire the upstream nested settings-scope
    // seam, whose absence on older hosts must not hide the market entry.
    const source = readFileSync(CLIENT_ENTRY, 'utf8')
    expect(declaredSeams()).not.toContain('settingsScope')
    expect(source).not.toContain("inject(['settingsScope']")
  })

  it('registers the managed sections and their dictionary', () => {
    const source = readFileSync(CLIENT_ENTRY, 'utf8')
    expect(source).toContain("ctx.locale.register('lawyer-market'")
    expect(source).toContain("ctx.slots.inject('settings.section'")
    expect(source).toContain("id: 'lawyer-market'")
  })
})
