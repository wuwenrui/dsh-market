import { describe, it, expect } from 'vitest'
import { generateKeyPairSync, sign } from 'node:crypto'
import { decodeCatalog, type CatalogTrust } from '../src/managed/catalog.ts'
const keys = generateKeyPairSync('ed25519')
const trust: CatalogTrust = { catalogUrl: 'https://model.example/catalog.json', artifactOrigin: 'https://model.example', hostVersion: '0.1.3-alpha.2', publicKey: keys.publicKey.export({ type: 'spki', format: 'pem' }).toString() }
const now = Date.now()
const plugin = { id: 'lawyer-test', packageName: '@lawyer-dsh/test', version: '1.0.0', name: '测试材料', description: '材料校验', category: '立案', hostVersions: ['0.1.3-alpha.2'], artifact: { url: `https://model.example/artifacts/${'a'.repeat(64)}.tgz`, sha256: 'a'.repeat(64), size: 100 } }
const communityEntry = { id: 'community-fixture', owner: 'example', repo: 'https://github.com/example/fixture-plugin', packageName: '@community/fixture-plugin', version: '1.2.0', name: '社区 fixture', description: '社区条目', category: '记忆', hostVersions: ['0.1.3-alpha.2'], install: { kind: 'npm', target: '@community/fixture-plugin' } }
function data(overrides: object = {}) { return { schemaVersion: 1, revision: 10, issuedAt: new Date(now - 1000).toISOString(), expiresAt: new Date(now + 60000).toISOString(), plugins: [plugin], community: [], ...overrides } }
function signed(value: unknown) { const payload = Buffer.from(JSON.stringify(value)); return Buffer.from(JSON.stringify({ payload: payload.toString('base64'), signature: sign(null, payload, keys.privateKey).toString('base64') })) }
describe('managed catalog authenticity and admission', () => {
  it('accepts a signed release and a legitimate empty catalog', () => {
    expect(decodeCatalog(signed(data()), trust, 9, now).plugins[0]?.version).toBe('1.0.0')
    expect(decodeCatalog(signed(data({ plugins: [], community: [] })), trust, 9, now).plugins).toEqual([])
  })
  it('projects signed community entries beside owned releases from the same document', () => {
    const catalog = decodeCatalog(signed(data({ community: [communityEntry] })), trust, 9, now)
    expect(catalog.plugins.map(entry => entry.id)).toEqual(['lawyer-test', 'community-fixture'])
    expect(catalog.plugins[1]).toMatchObject({ source: 'community', install: { kind: 'npm', target: '@community/fixture-plugin' } })
  })
  it.each([
    ['impersonate a product package', { ...communityEntry, packageName: '@deepseek-ai/dsh-tools', install: { kind: 'npm', target: '@deepseek-ai/dsh-tools' } }],
    ['point npm at another package', { ...communityEntry, install: { kind: 'npm', target: '@attacker/other' } }],
    ['omit the tarball digest', { ...communityEntry, install: { kind: 'tarball', target: 'https://github.com/example/fixture-plugin/releases/download/v1/x.tgz', size: 10 } }],
    ['name a non-github repository', { ...communityEntry, repo: 'https://evil.example/example/fixture-plugin' }],
    ['duplicate an owned identity', { ...communityEntry, id: 'lawyer-test' }],
  ])('rejects a signed community entry that would %s', (_name, entry) => {
    expect(() => decodeCatalog(signed(data({ community: [entry] })), trust, 9, now)).toThrow()
  })
  it('rejects a modified payload, untrusted signing key and missing signature', () => {
    const envelope = JSON.parse(signed(data()).toString()) as { payload: string; signature: string }
    envelope.payload = Buffer.from(JSON.stringify(data({ plugins: [] }))).toString('base64')
    expect(() => decodeCatalog(Buffer.from(JSON.stringify(envelope)), trust)).toThrow(/签名/)
    const other = generateKeyPairSync('ed25519').publicKey.export({ type: 'spki', format: 'pem' }).toString()
    expect(() => decodeCatalog(signed(data()), { ...trust, publicKey: other })).toThrow(/签名/)
    expect(() => decodeCatalog(Buffer.from(JSON.stringify(data())), trust)).toThrow()
  })
  it('names a gateway HTML page that answered 200 instead of a catalog', () => {
    expect(() => decodeCatalog(Buffer.from('<!doctype html><html></html>'), trust)).toThrow(/不是有效 JSON/)
  })
  it('rejects expired, future-dated and rolled-back catalogs', () => {
    expect(() => decodeCatalog(signed(data({ expiresAt: new Date(now - 1).toISOString() })), trust, 0, now)).toThrow()
    expect(() => decodeCatalog(signed(data({ issuedAt: new Date(now + 400000).toISOString() })), trust, 0, now)).toThrow()
    expect(() => decodeCatalog(signed(data()), trust, 11, now)).toThrow()
  })
  it.each(['https://evil.example/artifacts/', 'https://model.example.evil.test/artifacts/', 'http://model.example/artifacts/', 'https://user:password@model.example/artifacts/'])('rejects artifact origin %s', origin => {
    expect(() => decodeCatalog(signed(data({ plugins: [{ ...plugin, artifact: { ...plugin.artifact, url: `${origin}${plugin.artifact.sha256}.tgz` } }] })), trust, 0, now)).toThrow()
  })
  it('rejects duplicate identities and floating versions', () => {
    expect(() => decodeCatalog(signed(data({ plugins: [plugin, plugin] })), trust, 0, now)).toThrow()
    expect(() => decodeCatalog(signed(data({ plugins: [{ ...plugin, version: 'latest' }] })), trust, 0, now)).toThrow()
    expect(() => decodeCatalog(signed(data({ plugins: [{ ...plugin, packageName: '@deepseek-ai/dsh' }] })), trust, 0, now)).toThrow()
  })
})
