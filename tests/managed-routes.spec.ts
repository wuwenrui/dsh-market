import { beforeAll, afterAll, expect, it } from 'vitest'
import { createServer, request as httpRequest, type Server } from 'node:http'
import { generateKeyPairSync, sign } from 'node:crypto'
import { mkdtemp, mkdir, rm, writeFile, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { mountManagedMarket, type LawyerPlatform } from '../src/managed/routes.ts'
import type { MarketHost } from '../src/routes.ts'
let origin: string, root: string, server: Server, dispose: () => Promise<void>
let saveCalls = 0, catalogRequests = 0
beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'lawyer-market-routes-'))
  const profile = join(root, 'profiles', 'lawyer'); await mkdir(profile, { recursive: true }); await writeFile(join(profile, 'package.json'), '{"name":"protected"}')
  const keys = generateKeyPairSync('ed25519')
  let handler: Parameters<MarketHost['webServer']['register']>[0]['handler'] = (_req, res) => { res.end() }
const payload = Buffer.from(JSON.stringify({ schemaVersion: 1, revision: 1, issuedAt: new Date(Date.now() - 1000).toISOString(), expiresAt: new Date(Date.now() + 60000).toISOString(), plugins: [] }))
  server = createServer((req, res) => {
    if (req.url === '/catalog') {
      catalogRequests++
      res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ payload: payload.toString('base64'), signature: sign(null, payload, keys.privateKey).toString('base64') })); return
    }
    void handler(req, res)
  })
  await new Promise<void>(resolve => { server.listen(0, '127.0.0.1', resolve) })
  const address = server.address(); if (address === null || typeof address === 'string') throw new Error('no test port')
  origin = `http://127.0.0.1:${address.port}`
  const host = { webServer: { register(route: Parameters<MarketHost['webServer']['register']>[0]) { handler = route.handler; return () => {} } } } as MarketHost
  const platform: LawyerPlatform = {
    marketOptions: () => ({ profileDirectory: profile, catalogUrl: `${origin}/catalog`, artifactOrigin: origin, hostVersion: '0.1.3-alpha.2', publicKey: keys.publicKey.export({ type: 'spki', format: 'pem' }).toString(), protectedPackages: ['@lawyer-dsh/market'], pnpm: { file: '/must-never-run', args: [] }, launcher: { file: '/must-never-run', args: [] }, agentsBusy: () => false }),
    modelStatus: async () => ({ configured: false, models: [], selected: '' }),
    saveCredential: async () => { saveCalls++ }, refreshModels: async () => [], selectModel: async () => {},
  }
  dispose = mountManagedMarket(host, platform)
})
afterAll(async () => { await dispose(); await new Promise<void>(resolve => { server.close(() => resolve()) }); await rm(root, { recursive: true, force: true }) })
async function post(path: string, body: unknown, from = origin) {
  return fetch(`${origin}/dsh-market/${path}`, { method: 'POST', headers: { origin: from, 'x-lawyer-market': '1', 'content-type': 'application/json' }, body: JSON.stringify(body) })
}
it.each(['restore', 'restore-snapshot', 'migrate-source', 'approve-builds', 'setup-pnpm', 'channel', 'region', 'github-proxy', 'self-uninstall', 'toggle', 'bundle-order', 'use-skin', 'presets', 'webdav', 'gist', 'api/v1/updates', 'api/v1/rollback', 'rollback'])('closes legacy bypass %s before touching the catalog or installer', async path => {
  const count = catalogRequests
  const response = await post(path, { name: '@lawyer-dsh/market', url: 'github:evil/plugin', force: true })
  expect(response.status).toBe(403)
  expect(catalogRequests).toBe(count)
})
it('rejects an arbitrary URL, unknown plugin and infrastructure uninstall', async () => {
  expect((await post('install', { url: 'https://evil.example/plugin.tgz' })).status).toBe(403)
  expect((await post('install', { id: 'unknown', version: '1.0.0' })).status).toBe(403)
  expect((await post('uninstall', { id: '@lawyer-dsh/market' })).status).toBe(403)
  expect(await readFile(join(root, 'profiles', 'lawyer', 'package.json'), 'utf8')).toBe('{"name":"protected"}')
})
it('accepts a signed empty catalog, not a public fallback', async () => {
  const response = await fetch(`${origin}/dsh-market/registry`)
  expect(response.status).toBe(200)
  expect(await response.json()).toMatchObject({ plugins: [], revision: 1 })
})
it('rejects cross-origin writes and endpoint fields on the credential API', async () => {
  expect((await post('credential', { key: 'test' }, 'https://evil.example')).status).toBe(403)
  expect((await post('credential', { key: 'test', baseURL: 'https://evil.example' })).status).toBe(403)
  expect(saveCalls).toBe(0)
  expect((await post('credential', { key: 'test-only' })).status).toBe(200)
  expect(saveCalls).toBe(1)
})

it('rejects a rebinding hostname even when Origin matches Host', async () => {
  const response = await new Promise<number | undefined>((resolve, reject) => {
    const target = new URL(origin)
    const request = httpRequest({ hostname: target.hostname, port: target.port, path: '/dsh-market/models', headers: { host: `evil.example:${target.port}`, origin: `http://evil.example:${target.port}` } }, response => { response.resume(); response.on('end', () => resolve(response.statusCode)) })
    request.on('error', reject); request.end()
  })
  expect(response).toBe(403)
  expect((await fetch(`${origin}/dsh-market/models`, { headers: { 'x-forwarded-for': '203.0.113.2' } })).status).toBe(403)
})
