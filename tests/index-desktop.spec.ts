/** The managed fork must not inherit the community CLI/Desktop authority fallback. */
import { describe, expect, it, vi } from 'vitest'
import type { Context } from '@deepseek-ai/cordis'
import { apply, inject } from '../src/index.ts'
import type { LawyerPlatform } from '../src/managed/routes.ts'

function fixture(platform?: LawyerPlatform, extra: Record<string, unknown> = {}) {
  const unregister = vi.fn()
  const register = vi.fn((_route: unknown) => unregister)
  const effects: Array<() => unknown> = []
  const effect = vi.fn((callback: () => (() => unknown)) => { const dispose = callback(); effects.push(dispose); return dispose })
  const value = { webServer: { register }, loader: { entries: () => [] }, effect, lawyerPlatform: platform, ...extra }
  return { ctx: value as unknown as Context, register, unregister, effect, effects }
}
const platform: LawyerPlatform = {
  marketOptions: () => ({ profileDirectory: '/isolated/profiles/lawyer', catalogUrl: 'https://model.example/catalog', artifactOrigin: 'https://model.example', publicKey: '', hostVersion: '0.1.3-alpha.2', protectedPackages: ['@lawyer-dsh/market'], pnpm: { file: '/never-run', args: [] }, launcher: { file: '/never-run', args: [] }, agentsBusy: () => false }),
  modelStatus: async () => ({}), saveCredential: async () => {}, refreshModels: async () => [], selectModel: async () => {},
}
describe('managed entry authority, including Desktop', () => {
  it('declares product authority as a required dependency', () => {
    expect(inject).toEqual(['webServer', 'loader', 'lawyerPlatform'])
  })
  it.each([{}, { desktopProfiles: { current: { name: 'desktop', dir: '/untrusted' } } }, { desktopPnpm: { runPlugin: vi.fn() } }])('refuses ambient CLI or third-party Desktop services without product authority', extra => {
    const { ctx, register, effect } = fixture(undefined, extra)
    expect(() => apply(ctx)).toThrow(expect.objectContaining({ code: 'PLATFORM_REQUIRED' }))
    expect(register).not.toHaveBeenCalled()
    expect(effect).not.toHaveBeenCalled()
  })
  it('mounts only the managed route family and disposes it with the owner', async () => {
    const { ctx, register, unregister, effects } = fixture(platform)
    apply(ctx)
    expect(register).toHaveBeenCalledTimes(1)
    expect(register.mock.calls[0]?.[0]).toMatchObject({ kind: 'prefix', path: '/dsh-market' })
    for (const dispose of effects) await dispose()
    expect(unregister).toHaveBeenCalledOnce()
  })
  it('refuses per-user profile, restart and source overrides before any route mounts', () => {
    const { ctx, register } = fixture(platform)
    expect(() => apply(ctx, { profile: 'web', allowRestart: true } as never)).toThrow(expect.objectContaining({ code: 'PRODUCT_OWNED' }))
    expect(register).not.toHaveBeenCalled()
  })
})
