import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createServer, type Server } from 'node:http'
import { createHash } from 'node:crypto'
import { mkdtemp, rm, readdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { assertCommunityBundlePatch } from '../src/managed/artifact.ts'
import { downloadCommunityArtifact, parseCommunityAllowlist, resolveCommunityCatalogEntries } from '../src/managed/community.ts'

const OWNER = 'example', REPO = 'https://github.com/example/fixture-plugin', PACKAGE = '@community/fixture-plugin'
function allowlist(plugins: unknown[], source = 'https://community.example/plugins.json') {
  return parseCommunityAllowlist({ schemaVersion: 1, source, updatedAt: '2026-09-08', plugins })
}
const entry = { id: 'fixture-plugin', owner: OWNER, repo: REPO, packageName: PACKAGE, version: '2.5.0', category: '社区', enabled: true }

describe('community open-list validation', () => {
  it('accepts a closed empty list and a fully specified entry', () => {
    expect(allowlist([]).plugins).toEqual([])
    expect(allowlist([entry]).plugins[0]).toMatchObject({ id: 'fixture-plugin', version: '2.5.0', enabled: true })
  })
  it.each([
    ['non-https source', [], 'http://community.example/plugins.json'],
    ['reserved product package', [{ ...entry, packageName: '@deepseek-ai/dsh-mcp-client' }], undefined],
    ['another product namespace', [{ ...entry, packageName: '@lawyer-dsh/market' }], undefined],
    ['floating version', [{ ...entry, version: 'latest' }], undefined],
    ['invalid id', [{ ...entry, id: 'Fixture_Plugin' }], undefined],
    ['non-github repository', [{ ...entry, repo: 'https://evil.example/x/y' }], undefined],
    ['duplicate identity', [entry, entry], undefined],
    ['tarball without digest', [{ ...entry, tarball: { url: 'https://github.com/example/fixture-plugin/releases/download/v2.5.0/p.tgz', sha256: 'nope', size: 10 } }], undefined],
  ])('rejects %s', (_name, plugins, source) => {
    expect(() => allowlist(plugins, source)).toThrow()
  })
})

describe('community composition isolation', () => {
  it('admits only the plugin own insert rows', () => {
    expect(() => assertCommunityBundlePatch([{ insert: [{ id: 'fixture-plugin', name: PACKAGE }] }], PACKAGE)).not.toThrow()
    expect(() => assertCommunityBundlePatch([{ insert: [{ id: 'fixture-client', name: `${PACKAGE}/client` }] }], PACKAGE)).not.toThrow()
  })
  it.each([
    ['replace a product row', [{ id: 'llm-pi-ai', config: {} }]],
    ['claim a reserved row id', [{ insert: [{ id: 'llm-pi-ai', name: PACKAGE }] }]],
    ['mount another package', [{ insert: [{ id: 'fixture-plugin', name: 'evil-package' }] }]],
    ['create a group', [{ insert: [{ id: 'fixture-plugin', name: PACKAGE, group: true }] }]],
  ])('rejects an attempt to %s', (_name, patch) => {
    expect(() => assertCommunityBundlePatch(patch, PACKAGE)).toThrow()
  })
})

describe('community discovery and pinned artifacts', () => {
  let origin: string, server: Server, root: string
  const artifacts = new Map<string, Buffer>()
  let registry = { plugins: [] as unknown[] }
  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), 'lawyer-community-'))
    server = createServer((request, response) => {
      if (request.url === '/plugins.json') { response.setHeader('content-type', 'application/json'); response.end(JSON.stringify(registry)); return }
      const hash = request.url?.match(/^\/artifact\/([a-f0-9]{64})\.tgz$/)?.[1]
      if (hash && artifacts.has(hash)) { response.end(artifacts.get(hash)); return }
      response.writeHead(404); response.end()
    })
    await new Promise<void>(resolve => { server.listen(0, '127.0.0.1', resolve) })
    const address = server.address(); if (!address || typeof address === 'string') throw new Error('no port')
    origin = `http://127.0.0.1:${address.port}`
  })
  afterAll(async () => { server.closeAllConnections(); await new Promise<void>(resolve => { server.close(() => resolve()) }); await rm(root, { recursive: true, force: true }) })

  function registryEntry(overrides: Record<string, unknown> = {}) {
    return { name: 'fixture-plugin', owner: OWNER, url: REPO, npm: PACKAGE, version: '9.9.9', category: 'memory', description: { zh: '社区测试插件', en: 'fixture' }, ...overrides }
  }
  async function configured(overrides: Record<string, unknown> = {}, entryOverrides: Record<string, unknown> = {}) {
    registry = { plugins: [registryEntry(overrides)] }
    return allowlist([{ ...entry, ...entryOverrides }], `${origin}/plugins.json`)
  }

  it('lists only allowlisted entries and keeps our pinned version over the community latest', async () => {
    const list = await configured()
    const releases = await resolveCommunityCatalogEntries(list, '0.1.3-alpha.2')
    expect(releases).toHaveLength(1)
    expect(releases[0]).toMatchObject({ id: 'fixture-plugin', owner: OWNER, repo: REPO, packageName: PACKAGE, version: '2.5.0', hostVersions: ['0.1.3-alpha.2'], install: { kind: 'npm', target: PACKAGE } })
    expect(releases[0]?.description).toBe('社区测试插件')
  })
  it('leaves every unlisted community plugin closed', async () => {
    registry = { plugins: [registryEntry({ name: 'not-open', url: 'https://github.com/example/not-open' })] }
    expect(await resolveCommunityCatalogEntries(allowlist([]), '0.1.3-alpha.2')).toEqual([])
  })
  it('refuses a community entry whose repository, owner or npm identity moved', async () => {
    await expect(resolveCommunityCatalogEntries(await configured({ url: 'https://github.com/attacker/fixture-plugin' }), '0.1.3-alpha.2')).rejects.toMatchObject({ code: 'COMMUNITY_ENTRY_MISMATCH' })
    await expect(resolveCommunityCatalogEntries(await configured({ npm: '@attacker/fixture-plugin' }), '0.1.3-alpha.2')).rejects.toMatchObject({ code: 'COMMUNITY_ENTRY_MISMATCH' })
    await expect(resolveCommunityCatalogEntries(await configured({ owner: 'attacker' }), '0.1.3-alpha.2')).rejects.toMatchObject({ code: 'COMMUNITY_ENTRY_MISMATCH' })
  })
  it('refuses an allowlisted entry that disappeared or was deprecated upstream', async () => {
    registry = { plugins: [] }
    await expect(resolveCommunityCatalogEntries(allowlist([entry], `${origin}/plugins.json`), '0.1.3-alpha.2')).rejects.toMatchObject({ code: 'COMMUNITY_ENTRY_MISSING' })
    await expect(resolveCommunityCatalogEntries(await configured({ deprecated: true }), '0.1.3-alpha.2')).rejects.toMatchObject({ code: 'COMMUNITY_ENTRY_MISSING' })
  })
  it('verifies a pinned community archive by digest and rejects substituted bytes', async () => {
    const good = Buffer.from('community-archive-bytes')
    const sha256 = createHash('sha256').update(good).digest('hex')
    artifacts.set(sha256, good)
    const install = { kind: 'tarball' as const, target: `${origin}/artifact/${sha256}.tgz`, sha256, size: good.length }
    await expect(downloadCommunityArtifact(PACKAGE, install, join(root, 'cache'))).resolves.toMatch(/community-[a-f0-9]{64}\.tgz$/)
    const wrong = createHash('sha256').update(Buffer.from('other')).digest('hex')
    artifacts.set(wrong, Buffer.from('substituted'))
    await expect(downloadCommunityArtifact(PACKAGE, { kind: 'tarball', target: `${origin}/artifact/${wrong}.tgz`, sha256, size: good.length }, join(root, 'cache-2'))).rejects.toMatchObject({ code: 'ARTIFACT_INTEGRITY' })
    expect((await readdir(join(root, 'cache-2')).catch(() => [])).filter(name => name.endsWith('.tgz'))).toEqual([])
  })
})
