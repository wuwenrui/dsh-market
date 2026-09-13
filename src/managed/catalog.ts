/** Signed catalog: the single distribution point for owned and opened community releases. */
import { createPublicKey, verify } from 'node:crypto'
import type { ManagedRelease, ManagedCatalog, CatalogTrust } from './types.ts'
export type { ManagedRelease, ManagedCatalog, CatalogTrust } from './types.ts'

export class ManagedError extends Error {
  constructor(readonly code: string, message: string, readonly status = 400) { super(message); this.name = 'ManagedError' }
}
export const MAX_CATALOG_BYTES = 4 * 1024 * 1024
export const MAX_ARTIFACT_BYTES = 64 * 1024 * 1024
const ID = /^[a-z][a-z0-9-]{0,79}$/
const OWNER = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/
const PACKAGE = /^(?:@[a-z0-9-]+\/)?[a-z0-9][a-z0-9._-]*$/
const VERSION = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/
const SHA256 = /^[a-f0-9]{64}$/

export function object(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) throw new ManagedError('INVALID_DATA', '无效的市场数据')
  return value as Record<string, unknown>
}
function string(value: unknown, max: number): string {
  if (typeof value !== 'string' || value.length === 0 || value.length > max) throw new ManagedError('INVALID_DATA', '无效的目录字段')
  return value
}
/** Parse catalog JSON, naming a gateway HTML page that answered with HTTP 200. */
function parseJson(text: string): unknown {
  try { return JSON.parse(text) as unknown } catch {
    throw new ManagedError('INVALID_CATALOG', '平台目录不是有效 JSON（可能是网关错误页或目录尚未发布）', 502)
  }
}
function identity(p: Record<string, unknown>, seen: { ids: Set<string>, packages: Set<string> }): { id: string, packageName: string, version: string } {
  const id = string(p.id, 80), packageName = string(p.packageName, 214), version = string(p.version, 80)
  if (!ID.test(id) || !PACKAGE.test(packageName) || !VERSION.test(version)) {
    throw new ManagedError('INVALID_RELEASE', '插件标识、包名或版本不符合发布规范')
  }
  if (seen.ids.has(id) || seen.packages.has(packageName)) throw new ManagedError('DUPLICATE_RELEASE', '目录包含重复插件')
  seen.ids.add(id); seen.packages.add(packageName)
  return { id, packageName, version }
}
/** Community artifact URLs must be HTTPS; loopback HTTP is allowed for local fixtures. */
function secureUrl(value: unknown, max: number): URL {
  const url = new URL(string(value, max))
  if (url.protocol === 'https:') return url
  if (url.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) return url
  throw new ManagedError('INVALID_RELEASE', '社区制品地址必须是 HTTPS')
}
function common(p: Record<string, unknown>): Pick<ManagedRelease, 'name' | 'description' | 'category' | 'hostVersions'> {
  if (!Array.isArray(p.hostVersions) || p.hostVersions.length === 0 || p.hostVersions.some(v => typeof v !== 'string' || !VERSION.test(v))) {
    throw new ManagedError('INVALID_COMPATIBILITY', '宿主兼容信息无效')
  }
  return { name: string(p.name, 120), description: string(p.description, 3000), category: string(p.category, 80), hostVersions: p.hostVersions as string[] }
}
function ownedRelease(item: unknown, trust: CatalogTrust, seen: { ids: Set<string>, packages: Set<string> }): ManagedRelease {
  const p = object(item), artifact = object(p.artifact)
  const { id, packageName, version } = identity(p, seen)
  // An owned release is our own package, never a host package.
  if (packageName.startsWith('@deepseek-ai/')) throw new ManagedError('INVALID_RELEASE', '自有插件不得占用宿主包命名空间')
  const sha256 = string(artifact.sha256, 64), url = new URL(string(artifact.url, 2048))
  const origin = new URL(trust.artifactOrigin)
  if (!SHA256.test(sha256) || !Number.isSafeInteger(artifact.size) || (artifact.size as number) < 1 || (artifact.size as number) > MAX_ARTIFACT_BYTES) {
    throw new ManagedError('INVALID_ARTIFACT', '插件制品摘要或大小无效')
  }
  if (url.origin !== origin.origin || url.username !== '' || url.password !== '' || url.search !== '' || url.hash !== '' || !url.pathname.endsWith(`/${sha256}.tgz`)) {
    throw new ManagedError('UNTRUSTED_ARTIFACT', '插件下载地址不在平台许可范围', 403)
  }
  return { id, packageName, version, source: 'owned', ...common(p), artifact: { url: url.href, sha256, size: artifact.size as number } }
}
function communityRelease(item: unknown, seen: { ids: Set<string>, packages: Set<string> }): ManagedRelease {
  const p = object(item)
  const { id, packageName, version } = identity(p, seen)
  // A community entry may never claim a product namespace.
  if (packageName.startsWith('@deepseek-ai/') || packageName.startsWith('@lawyer-dsh/')) {
    throw new ManagedError('INVALID_RELEASE', '社区条目不得使用产品包命名空间')
  }
  if (!OWNER.test(string(p.owner, 39))) throw new ManagedError('INVALID_RELEASE', '社区条目缺少有效 owner')
  const repo = new URL(string(p.repo, 2048))
  if (repo.protocol !== 'https:' || repo.hostname !== 'github.com' || repo.pathname.split('/').filter(Boolean).length !== 2) {
    throw new ManagedError('INVALID_RELEASE', '社区条目仓库必须是 github.com/<owner>/<repo>')
  }
  const install = object(p.install), kind = install.kind
  let target: string
  if (kind === 'npm') {
    target = string(install.target, 214)
    if (target !== packageName) throw new ManagedError('INVALID_RELEASE', '社区 npm 目标必须等于受审包名')
    return { id, packageName, version, source: 'community', ...common(p), install: { kind, target } }
  }
  if (kind !== 'tarball') throw new ManagedError('INVALID_RELEASE', '社区条目安装方式无效')
  const url = secureUrl(install.target, 2048), sha256 = string(install.sha256, 64), size = install.size
  if (!SHA256.test(sha256) || !Number.isSafeInteger(size) || (size as number) < 1 || (size as number) > MAX_ARTIFACT_BYTES) {
    throw new ManagedError('INVALID_RELEASE', '社区制品摘要或大小无效')
  }
  return { id, packageName, version, source: 'community', ...common(p), install: { kind, target: url.href, sha256, size: size as number } }
}

export function decodeCatalog(bytes: Uint8Array, trust: CatalogTrust, minimumRevision = 0, now = Date.now()): ManagedCatalog {
  if (bytes.byteLength > MAX_CATALOG_BYTES) throw new ManagedError('CATALOG_TOO_LARGE', '目录超过大小限制')
  const envelope = object(parseJson(Buffer.from(bytes).toString('utf8')))
  const encoded = string(envelope.payload, MAX_CATALOG_BYTES)
  const signature = Buffer.from(string(envelope.signature, 200), 'base64')
  const payload = Buffer.from(encoded, 'base64')
  const key = createPublicKey(trust.publicKey)
  if (key.asymmetricKeyType !== 'ed25519' || signature.length !== 64 || !verify(null, payload, key, signature)) {
    throw new ManagedError('BAD_SIGNATURE', '插件目录签名验证失败', 403)
  }
  const data = object(parseJson(payload.toString('utf8')))
  const revision = data.revision
  const issuedAt = string(data.issuedAt, 40)
  const expiresAt = string(data.expiresAt, 40)
  const issued = Date.parse(issuedAt), expires = Date.parse(expiresAt)
  if (data.schemaVersion !== 1 || !Number.isSafeInteger(revision) || (revision as number) < 1 || (revision as number) < minimumRevision) {
    throw new ManagedError('STALE_CATALOG', '目录版本无效或已过期', 403)
  }
  if (!Number.isFinite(issued) || !Number.isFinite(expires) || issued > now + 300_000 || expires <= now || expires <= issued) {
    throw new ManagedError('EXPIRED_CATALOG', '插件目录已过期，请联系平台更新', 403)
  }
  if (!Array.isArray(data.plugins) || data.plugins.length > 1000) throw new ManagedError('INVALID_CATALOG', '自有插件列表无效')
  if (data.community !== undefined && (!Array.isArray(data.community) || data.community.length > 1000)) throw new ManagedError('INVALID_CATALOG', '社区插件列表无效')
  const seen = { ids: new Set<string>(), packages: new Set<string>() }
  const plugins = (data.plugins as unknown[]).map(item => ownedRelease(item, trust, seen))
  const community = ((data.community as unknown[] | undefined) ?? []).map(item => communityRelease(item, seen))
  return { schemaVersion: 1, revision: revision as number, issuedAt, expiresAt, plugins: [...plugins, ...community] }
}

/** Read bounded bytes without following redirects or inheriting model credentials. */
export async function fetchBytes(url: string, max: number, signal?: AbortSignal): Promise<Buffer> {
  const timeout = AbortSignal.timeout(30_000)
  const response = await fetch(url, { redirect: 'error', signal: signal === undefined ? timeout : AbortSignal.any([timeout, signal]), headers: { accept: 'application/json, application/octet-stream' }, credentials: 'omit' })
  if (!response.ok) throw new ManagedError('SOURCE_UNAVAILABLE', `平台服务暂不可用（${response.status}）`, 502)
  const length = Number(response.headers.get('content-length'))
  if (Number.isFinite(length) && length > max) throw new ManagedError('DOWNLOAD_TOO_LARGE', '下载内容超过大小限制')
  if (response.body === null) throw new ManagedError('EMPTY_RESPONSE', '平台返回空内容', 502)
  const reader = response.body.getReader(), chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const part = await reader.read()
      if (part.done) break
      size += part.value.byteLength
      if (size > max) throw new ManagedError('DOWNLOAD_TOO_LARGE', '下载内容超过大小限制')
      chunks.push(part.value)
    }
    return Buffer.concat(chunks)
  } finally { await reader.cancel().catch(() => undefined) }
}
