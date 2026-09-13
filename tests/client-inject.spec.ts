/** LawyerDesk keeps client seam admission in the managed entry, not package metadata. */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const packageJson = JSON.parse(readFileSync(resolve('package.json'), 'utf8')) as {
  dsh?: { client?: { inject?: unknown } }
}
const clientSource = readFileSync(resolve('src/client/index.ts'), 'utf8')
const entryInject = [...clientSource.matchAll(/export const inject = \[([^\]]*)\]/g)][0]?.[1]
  ?.split(',')
  .map(value => value.trim().replace(/^['"`]|['"`]$/g, ''))
  .filter(Boolean) ?? []

describe('managed client seam admission', () => {
  it('does not use upstream package-level dsh.client.inject gating', () => {
    expect(packageJson.dsh?.client?.inject).toBeUndefined()
  })

  it('declares the exact seams used by the managed client entry', () => {
    expect(entryInject).toEqual(['slots', 'locale', 'theme'])
    expect(clientSource).not.toContain("inject(['settingsScope']")
  })

  it('keeps the managed package client surface available without optional settings metadata', () => {
    expect(packageJson.dsh?.client).toMatchObject({ platform: 'web' })
    expect(clientSource).toContain("ctx.slots.inject('settings.section'")
    expect(clientSource).toContain("ctx.locale.register('lawyer-market'")
  })
})
