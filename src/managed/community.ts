/**
 * Community resolution for the publish pipeline. The community catalog is read
 * at publish time only; what ships to clients is the signed product catalog,
 * so opening or closing an entry never requires a product release.
 */
import { ManagedError, object } from './catalog.ts'

/** One product-approved community plugin, pinned to the exact version we opened. */
export interface CommunityAllowlistEntry {
  /** Stable product identity shown to users and used by install requests. */
  id: string
  /** GitHub owner of the reviewed repository. */
  owner: string
  /** Reviewed repository URL; the community catalog entry must match it. */
  repo: string
  /** Exact npm package name. */
  packageName: string
  /** Exact version this product has approved. */
  version: string
  /** Product category label shown in our market. */
  category: string
  /** Whether this entry is currently open. Absent or false keeps it closed. */
  enabled: boolean
  /** Pinned prebuilt archive; required when the catalog lists no npm package. */
  tarball?: { url: string; sha256: string; size: number }
}

/** The operator-maintained source list that becomes the catalog's `community` array. */
export interface CommunityAllowlist {
  schemaVersion: 1
  source: string
  updatedAt: string
  plugins: CommunityAllowlistEntry[]
}

/** One resolved entry exactly as it is signed into the product catalog. */
export interface CommunityCatalogEntry {
  id: string
  owner: string
  repo: string
  packageName: string
  version: string
  name: string
  description: string
  category: string
  hostVersions: string[]
  install: { kind: 'npm' | 'tarball', target: string, sha256?: string, size?: number }
}

/** Catalog-side community entry fields this gate consumes. */
interface CommunityEntry {
  name: string
  owner: string
  url: string
  npm?: string | null
  tarball?: string | null
  version?: string | null
  category?: string | string[]
  description?: Record<string, string>
  deprecated?: boolean
}

const ID = /^[a-z][a-z0-9-]{0,79}$/
const OWNER = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/
const PACKAGE = /^(?:@[a-z0-9-]+\/)?[a-z0-9][a-z0-9._-]*$/
const VERSION = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/
const MAX_COMMUNITY_BYTES = 8 * 1024 * 1024

/** Community sources and archives must be HTTPS; loopback HTTP is allowed for local fixtures. */
function assertSecure(url: URL, label: string): void {
  if (url.protocol === 'https:') return
  if (url.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) return
  throw new ManagedError('INVALID_ALLOWLIST', label + '必须是 HTTPS')
}
function string(value: unknown, max: number): string {
  if (typeof value !== 'string' || value.length === 0 || value.length > max) throw new ManagedError('INVALID_ALLOWLIST', '社区开放清单字段无效')
  return value
}

/** Parse and validate the operator source list. A closed or empty list is valid. */
export function parseCommunityAllowlist(value: unknown): CommunityAllowlist {
  const root = object(value)
  if (root.schemaVersion !== 1) throw new ManagedError('INVALID_ALLOWLIST', '社区开放清单版本无效')
  const source = string(root.source, 2048)
  assertSecure(new URL(source), '社区目录地址')
  const updatedAt = string(root.updatedAt, 40)
  if (!Array.isArray(root.plugins) || root.plugins.length > 500) throw new ManagedError('INVALID_ALLOWLIST', '社区开放清单条目无效')
  const ids = new Set<string>(), packages = new Set<string>()
  const plugins = root.plugins.map((raw): CommunityAllowlistEntry => {
    const entry = object(raw)
    const id = string(entry.id, 80), owner = string(entry.owner, 39), packageName = string(entry.packageName, 214), version = string(entry.version, 80)
    if (!ID.test(id) || !OWNER.test(owner) || !PACKAGE.test(packageName) || !VERSION.test(version) || packageName.startsWith('@deepseek-ai/') || packageName.startsWith('@lawyer-dsh/')) {
      throw new ManagedError('INVALID_ALLOWLIST', '社区开放清单包含无效的标识、仓库或版本')
    }
    if (ids.has(id) || packages.has(packageName)) throw new ManagedError('INVALID_ALLOWLIST', '社区开放清单存在重复条目')
    ids.add(id); packages.add(packageName)
    const repo = new URL(string(entry.repo, 2048))
    if (repo.protocol !== 'https:' || repo.hostname !== 'github.com' || repo.pathname.split('/').filter(Boolean).length !== 2) {
      throw new ManagedError('INVALID_ALLOWLIST', '社区仓库必须是 github.com/<owner>/<repo>')
    }
    const result: CommunityAllowlistEntry = {
      id, owner, repo: repo.href.replace(/\.git$/, '').replace(/\/$/, ''), packageName, version,
      category: string(entry.category, 80),
      enabled: entry.enabled === true,
    }
    if (entry.tarball !== undefined) {
      const tarball = object(entry.tarball)
      const url = new URL(string(tarball.url, 2048))
      const sha256 = string(tarball.sha256, 64), size = tarball.size
      assertSecure(url, '社区制品地址')
      if (!/^[a-f0-9]{64}$/.test(sha256) || !Number.isSafeInteger(size) || (size as number) < 1 || (size as number) > 64 * 1024 * 1024) {
        throw new ManagedError('INVALID_ALLOWLIST', '社区制品摘要或大小无效')
      }
      result.tarball = { url: url.href, sha256, size: size as number }
    }
    return result
  })
  return { schemaVersion: 1, source, updatedAt, plugins }
}

function normalizeRepo(value: string): string {
  return value.replace(/\.git$/, '').replace(/\/$/, '').toLowerCase()
}
function isCommunityEntry(value: unknown): value is CommunityEntry {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false
  const entry = value as CommunityEntry
  return typeof entry.name === 'string' && typeof entry.owner === 'string' && typeof entry.url === 'string'
}
function categoryOf(entry: CommunityEntry, fallback: string): string {
  const value = entry.category
  const first = Array.isArray(value) ? value.find(item => typeof item === 'string' && item.length > 0) : value
  return typeof first === 'string' && first.length > 0 ? first : fallback
}
function descriptionOf(entry: CommunityEntry, fallback: string): string {
  const value = entry.description
  if (value === null || typeof value !== 'object') return fallback
  const zh = value.zh, en = value.en
  const chosen = typeof zh === 'string' && zh.trim().length > 0 ? zh : en
  return typeof chosen === 'string' && chosen.trim().length > 0 ? chosen.trim().slice(0, 3000) : fallback
}

/** Read the community catalog with bounded size and redirects, for metadata only. */
async function fetchCommunityCatalog(source: string, signal?: AbortSignal): Promise<unknown> {
  const timeout = AbortSignal.timeout(30_000)
  const response = await fetch(source, {
    redirect: 'follow',
    credentials: 'omit',
    headers: { accept: 'application/json' },
    signal: signal === undefined ? timeout : AbortSignal.any([timeout, signal]),
  })
  if (!response.ok) throw new ManagedError('COMMUNITY_UNAVAILABLE', `社区目录暂不可用（${response.status}）`, 502)
  const declared = Number(response.headers.get('content-length'))
  if (Number.isFinite(declared) && declared > MAX_COMMUNITY_BYTES) throw new ManagedError('COMMUNITY_TOO_LARGE', '社区目录超过大小限制')
  if (response.body === null) throw new ManagedError('COMMUNITY_UNAVAILABLE', '社区目录返回空内容', 502)
  const reader = response.body.getReader(), chunks: Uint8Array[] = []
  let size = 0
  try {
    for (;;) {
      const part = await reader.read()
      if (part.done) break
      size += part.value.byteLength
      if (size > MAX_COMMUNITY_BYTES) throw new ManagedError('COMMUNITY_TOO_LARGE', '社区目录超过大小限制')
      chunks.push(part.value)
    }
  } finally { await reader.cancel().catch(() => undefined) }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown } catch { throw new ManagedError('COMMUNITY_INVALID', '社区目录不是有效 JSON', 502) }
}

/**
 * Resolve the open list against the live community catalog at publish time.
 * The community list supplies metadata; this product supplies identity, the
 * exact version and the compatibility decision that get signed into our catalog.
 */
export async function resolveCommunityCatalogEntries(
  allowlist: CommunityAllowlist,
  hostVersion: string,
  signal?: AbortSignal,
): Promise<CommunityCatalogEntry[]> {
  const enabled = allowlist.plugins.filter(entry => entry.enabled)
  if (enabled.length === 0) return []
  const document = object(await fetchCommunityCatalog(allowlist.source, signal))
  if (!Array.isArray(document.plugins)) throw new ManagedError('COMMUNITY_INVALID', '社区目录缺少插件列表', 502)
  const byRepo = new Map<string, CommunityEntry>(), byNpm = new Map<string, CommunityEntry>()
  for (const raw of document.plugins) {
    if (!isCommunityEntry(raw) || raw.deprecated === true) continue
    const key = normalizeRepo(raw.url)
    if (!byRepo.has(key)) byRepo.set(key, raw)
    if (typeof raw.npm === 'string' && raw.npm.length > 0 && !byNpm.has(raw.npm)) byNpm.set(raw.npm, raw)
  }
  return enabled.map((entry): CommunityCatalogEntry => {
    const found = byRepo.get(normalizeRepo(entry.repo)) ?? byNpm.get(entry.packageName)
    if (found === undefined) throw new ManagedError('COMMUNITY_ENTRY_MISSING', `社区目录中找不到已开放的插件：${entry.id}`, 409)
    if (normalizeRepo(found.url) !== normalizeRepo(entry.repo) || found.owner.toLowerCase() !== entry.owner.toLowerCase()) {
      throw new ManagedError('COMMUNITY_ENTRY_MISMATCH', `社区条目与开放记录不一致：${entry.id}`, 409)
    }
    const install = entry.tarball !== undefined
      ? { kind: 'tarball' as const, target: entry.tarball.url, sha256: entry.tarball.sha256, size: entry.tarball.size }
      : found.npm === entry.packageName
        ? { kind: 'npm' as const, target: entry.packageName }
        : undefined
    if (install === undefined) throw new ManagedError('COMMUNITY_ENTRY_MISMATCH', `社区条目缺少受审的 npm 包或制品：${entry.id}`, 409)
    return {
      id: entry.id,
      owner: entry.owner,
      repo: entry.repo,
      packageName: entry.packageName,
      version: entry.version,
      name: found.name,
      description: descriptionOf(found, `${found.name}（社区插件，已由平台审核开放）`),
      category: entry.category.length > 0 ? entry.category : categoryOf(found, '社区'),
      hostVersions: [hostVersion],
      install,
    }
  })
}

/**
 * Fetch a pinned community archive. Redirects are allowed because the digest
 * from our signed catalog, not the URL, is what authorizes the bytes.
 */
export async function downloadCommunityArtifact(
  packageName: string,
  install: { kind: 'npm' | 'tarball'; target: string; sha256?: string; size?: number } | undefined,
  cache: string,
  signal?: AbortSignal,
): Promise<string> {
  if (install === undefined || install.kind !== 'tarball' || install.sha256 === undefined || install.size === undefined) {
    throw new ManagedError('INVALID_ALLOWLIST', '社区制品缺少固定摘要或大小')
  }
  const { mkdir, writeFile, readFile, rename, rm } = await import('node:fs/promises')
  const { createHash } = await import('node:crypto')
  const { join } = await import('node:path')
  await mkdir(cache, { recursive: true, mode: 0o700 })
  const file = join(cache, `community-${install.sha256}.tgz`)
  const verify = async (bytes: Buffer): Promise<void> => {
    if (bytes.length !== install.size || createHash('sha256').update(bytes).digest('hex') !== install.sha256) {
      throw new ManagedError('ARTIFACT_INTEGRITY', '社区制品校验失败，未执行安装', 403)
    }
  }
  try { await verify(await readFile(file)); return file } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }
  const timeout = AbortSignal.timeout(60_000)
  const response = await fetch(install.target, {
    redirect: 'follow',
    credentials: 'omit',
    signal: signal === undefined ? timeout : AbortSignal.any([timeout, signal]),
  })
  if (!response.ok || response.body === null) throw new ManagedError('COMMUNITY_UNAVAILABLE', `社区制品暂不可用（${response.status}）`, 502)
  const reader = response.body.getReader(), chunks: Uint8Array[] = []
  let size = 0
  try {
    for (;;) {
      const part = await reader.read()
      if (part.done) break
      size += part.value.byteLength
      if (size > install.size) throw new ManagedError('DOWNLOAD_TOO_LARGE', '社区制品超过已审核大小', 403)
      chunks.push(part.value)
    }
  } finally { await reader.cancel().catch(() => undefined) }
  const bytes = Buffer.concat(chunks)
  await verify(bytes)
  const temporary = `${file}.${process.pid}.tmp`
  try {
    await writeFile(temporary, bytes, { mode: 0o600, flag: 'wx' })
    try { await rename(temporary, file) } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'EEXIST') throw error
      await verify(await readFile(file))
    }
    return file
  } finally { await rm(temporary, { force: true }) }
}
