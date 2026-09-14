import { afterAll, beforeAll, expect, it } from 'vitest'
import { createServer, type Server } from 'node:http'
import { generateKeyPairSync, sign, createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import * as tar from 'tar'
import { ManagedMarket, type ManagedMarketOptions } from '../src/managed/engine.ts'
import type { ManagedRelease } from '../src/managed/types.ts'

// Perimeter test: real package manager and filesystem; the child health responder
// is a fixture. tests/managed/product.e2e.mjs separately uses the real Harness.
let root: string, profile: string, origin: string, server: Server, options: ManagedMarketOptions
let release: ManagedRelease, releases: ManagedRelease[] = [], revision = 1, withdrawn = false, busy = false, paused = false
let communityEntries: unknown[] = []
let catalog: Buffer
const artifacts = new Map<string, Buffer>()
const communityArtifacts = new Map<string, Buffer>()
let communityRegistry: unknown = { plugins: [] }
const keys = generateKeyPairSync('ed25519')
function publish() {
  const payload = Buffer.from(JSON.stringify({ schemaVersion: 1, revision, issuedAt: new Date(Date.now() - 1000).toISOString(), expiresAt: new Date(Date.now() + 3600000).toISOString(), plugins: withdrawn ? [] : releases, community: communityEntries }))
  catalog = Buffer.from(JSON.stringify({ payload: payload.toString('base64'), signature: sign(null, payload, keys.privateKey).toString('base64') }))
}
async function packageVersion(id: string, version: string): Promise<ManagedRelease> {
  const packageName = `@lawyer-dsh/${id}`
  const directory = join(root, `source-${id}-${version}`); await mkdir(join(directory, 'package'), { recursive: true })
  await writeFile(join(directory, 'package', 'package.json'), JSON.stringify({ name: packageName, version, type: 'module', main: 'index.js', dsh: { bundle: { patch: './cordis.patch.yml' } } }))
  await writeFile(join(directory, 'package', 'index.js'), `export function apply() {}\nexport const version = ${JSON.stringify(version)}\n`)
  await writeFile(join(directory, 'package', 'cordis.patch.yml'), `- insert:\n    - id: lawyer-${id}\n      name: '${packageName}'\n`)
  const file = join(directory, 'artifact.tgz'); await tar.c({ file, cwd: directory, gzip: true, portable: true }, ['package'])
  const bytes = await readFile(file), sha256 = createHash('sha256').update(bytes).digest('hex'); artifacts.set(sha256, bytes)
  return { id, packageName, version, name: '事务验收', description: '事务验收 fixture', category: '测试', hostVersions: ['0.1.3-alpha.2'], artifact: { url: `${origin}/artifacts/${sha256}.tgz`, sha256, size: bytes.length } }
}
/** 把一个插件版本放进签名目录并推进 revision。 */
async function stage(id: string, version: string): Promise<ManagedRelease> {
  const next = await packageVersion(id, version)
  releases = [...releases.filter(item => item.id !== id), next]
  revision++; publish()
  return next
}
beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'lawyer-managed-transaction-')); profile = join(root, 'profiles', 'lawyer'); await mkdir(profile, { recursive: true })
  await writeFile(join(profile, 'package.json'), JSON.stringify({ name: 'isolated-profile', private: true, dependencies: {}, dsh: { profile: { bundles: [], patchReload: 'startup' } } }))
  await writeFile(join(profile, 'pnpm-workspace.yaml'), 'autoInstallPeers: false\nallowBuilds: {}\n')
  server = createServer((request, response) => {
    if (request.url === '/catalog') { response.end(catalog); return }
    if (request.url === '/withdraw') { withdrawn = true; revision++; publish(); response.end('{}'); return }
    if (request.url === '/community') { response.setHeader('content-type', 'application/json'); response.end(JSON.stringify(communityRegistry)); return }
    const communityHash = request.url?.match(/\/community-artifact\/([a-f0-9]{64})\.tgz/)?.[1]
    if (communityHash && communityArtifacts.has(communityHash)) { response.end(communityArtifacts.get(communityHash)); return }
    const hash = request.url?.match(/\/artifacts\/([a-f0-9]{64})\.tgz/)?.[1]
    if (hash && artifacts.has(hash)) { response.end(artifacts.get(hash)); return }
    response.writeHead(404); response.end()
  })
  await new Promise<void>(resolve => { server.listen(0, '127.0.0.1', resolve) })
  const address = server.address(); if (!address || typeof address === 'string') throw new Error('no port')
  origin = `http://127.0.0.1:${address.port}`
  const control = join(root, 'health-control.json'); await writeFile(control, '{}')
  const health = join(root, 'health.mjs')
  await writeFile(health, `import {createServer} from 'node:http';import {readFileSync} from 'node:fs';const control=JSON.parse(readFileSync(${JSON.stringify(control)},'utf8'));if(control.fail)process.exit(17);if(control.withdraw)await fetch(${JSON.stringify(origin + '/withdraw')});const port=Number(process.argv[process.argv.indexOf('--port')+1]);createServer((q,s)=>{s.setHeader('content-type','application/json');s.end(JSON.stringify({ready:true}))}).listen(port,'127.0.0.1');`)
  const require = createRequire(import.meta.url)
  options = { profileDirectory: profile, catalogUrl: `${origin}/catalog`, artifactOrigin: origin, hostVersion: '0.1.3-alpha.2', publicKey: keys.publicKey.export({ type: 'spki', format: 'pem' }).toString(), protectedPackages: ['@lawyer-dsh/market', '@lawyer-dsh/lawyer-platform'], pnpm: { file: process.execPath, args: [join(dirname(require.resolve('pnpm')), require('pnpm').bin.pnpm as string)] }, launcher: { file: process.execPath, args: [health] }, agentsBusy: () => busy, beginMutation() { if (paused) throw new Error('already paused'); paused = true; return () => { paused = false } } }
  release = await stage('transaction-test', '1.0.0')
})
afterAll(async () => { server.closeAllConnections(); await new Promise<void>(resolve => { server.close(() => resolve()) }); await rm(root, { recursive: true, force: true }) })
it('installs exact versions through real offline pnpm, and keeps accepting new installs before the restart', async () => {
  const market = new ManagedMarket(options)
  expect(await market.install(release.id, release.version)).toEqual({ ok: true, restartRequired: true })
  expect((await market.installed())[0]?.version).toBe('1.0.0')
  expect(market.status().restartRequired).toBe(true)
  // 重启只负责让新能力生效，不是继续安装的前置条件：同一个进程里切换过
  // profile 之后，还要能直接装下一个能力。
  const second = await stage('transaction-second', '1.0.0')
  const chained = market.install(second.id, second.version)
  // 仍然只允许一个操作同时进行：并发发起的第二次安装必须被拒。
  await expect(market.install(second.id, second.version)).rejects.toMatchObject({ code: 'BUSY' })
  expect(await chained).toEqual({ ok: true, restartRequired: true })
  expect((await market.installed()).map(row => row.id).sort()).toEqual(['transaction-second', 'transaction-test'])
  expect(market.status().restartRequired).toBe(true)
  // 更新同一个插件同样不必先重启，且两次变更都落在同一份 profile 上。
  release = await stage('transaction-test', '2.0.0')
  await market.install(release.id, release.version)
  expect((await market.installed()).find(row => row.id === 'transaction-test')?.version).toBe('2.0.0')
  expect(JSON.parse(await readFile(join(profile, 'node_modules', second.packageName, 'package.json'), 'utf8')).version).toBe('1.0.0')
  expect(paused).toBe(false)
}, 90_000)
it('does not mutate the active environment when child health verification fails', async () => {
  const before = await readFile(join(profile, 'package.json'), 'utf8')
  await writeFile(join(root, 'health-control.json'), '{"fail":true}')
  release = await stage('transaction-test', '3.0.0')
  const market = new ManagedMarket(options)
  await expect(market.install(release.id, release.version)).rejects.toThrow()
  expect(await readFile(join(profile, 'package.json'), 'utf8')).toBe(before)
  expect(existsSync(join(root, 'lawyer-market', 'operation.lock'))).toBe(false)
  expect(paused).toBe(false)
  await writeFile(join(root, 'health-control.json'), '{}')
})
it('rechecks authorization after health verification and refuses a withdrawn release', async () => {
  const before = await readFile(join(profile, 'package.json'), 'utf8')
  await writeFile(join(root, 'health-control.json'), '{"withdraw":true}')
  await expect(new ManagedMarket(options).install(release.id, release.version)).rejects.toMatchObject({ code: 'NOT_APPROVED' })
  expect(await readFile(join(profile, 'package.json'), 'utf8')).toBe(before)
  await writeFile(join(root, 'health-control.json'), '{}')
})
it('blocks active-agent mutations and uninstalls only the recorded business bundles', async () => {
  busy = true
  await expect(new ManagedMarket(options).uninstall('transaction-test')).rejects.toMatchObject({ code: 'BUSY' })
  busy = false
  const market = new ManagedMarket(options)
  await market.uninstall('transaction-test')
  await market.uninstall('transaction-second')
  expect(await market.installed()).toEqual([])
  const manifest = JSON.parse(await readFile(join(profile, 'package.json'), 'utf8'))
  expect(manifest.dsh.profile.bundles).toEqual([])
  expect(paused).toBe(false)
}, 60_000)

it('opens only allowlisted community plugins and installs the pinned archive through the same transaction', async () => {
  const packageName = '@community/fixture-plugin', version = '2.5.0'
  const directory = join(root, 'community-source'); await mkdir(join(directory, 'package'), { recursive: true })
  await writeFile(join(directory, 'package', 'package.json'), JSON.stringify({ name: packageName, version, type: 'module', main: 'index.js', dsh: { bundle: { patch: './cordis.patch.yml' } } }))
  await writeFile(join(directory, 'package', 'index.js'), 'export function apply() {}\n')
  await writeFile(join(directory, 'package', 'cordis.patch.yml'), `- insert:\n    - id: community-fixture\n      name: '${packageName}'\n`)
  const archive = join(directory, 'community.tgz'); await tar.c({ file: archive, cwd: directory, gzip: true, portable: true }, ['package'])
  const bytes = await readFile(archive), sha256 = createHash('sha256').update(bytes).digest('hex')
  communityArtifacts.set(sha256, bytes)
  communityRegistry = { plugins: [{ name: 'fixture-plugin', owner: 'example', url: 'https://github.com/example/fixture-plugin', npm: packageName, version: '9.9.9', category: 'memory', description: { zh: '社区测试插件', en: 'fixture' } }] }
  // The signed product catalog now carries the opened community entry itself.
  communityEntries = [{ id: 'fixture-plugin', owner: 'example', repo: 'https://github.com/example/fixture-plugin', packageName, version, name: 'fixture-plugin', description: '社区测试插件', category: '社区', hostVersions: ['0.1.3-alpha.2'], install: { kind: 'tarball', target: `${origin}/community-artifact/${sha256}.tgz`, sha256, size: bytes.length } }]
  revision++; publish()
  const market = new ManagedMarket(options)
  const catalog = await market.catalog()
  const entry = catalog.plugins.find(item => item.id === 'fixture-plugin')
  expect(entry).toMatchObject({ source: 'community', version: '2.5.0' })
  expect(catalog.plugins.some(item => item.version === '9.9.9')).toBe(false)
  await market.install('fixture-plugin', version)
  const record = (await market.installed()).find(item => item.id === 'fixture-plugin')
  expect(record).toMatchObject({ packageName, version, source: 'community', sha256 })
  expect(JSON.parse(await readFile(join(profile, 'node_modules', packageName, 'package.json'), 'utf8')).version).toBe(version)
  // The community entry came from the same signed document as the owned tier.
  expect((await market.catalog()).plugins.some(item => item.id === 'fixture-plugin')).toBe(true)
})
