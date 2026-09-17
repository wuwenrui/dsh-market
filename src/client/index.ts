import { ManagedMarketSection, ManagedModelsSection, managedZh, managedEn, type ManagedTranslate } from './ManagedMarket.tsx'
/**
 * dsh-market client: registers a "Market" settings section rendering the
 * plugin market UI, plus the post-install toast in the shell overlay layer.
 * Built by tsdown into the __ModuleLoader__ factory bundle at
 * client/client.js; the only externals are the loader module table's react
 * entries.
 */
import { createElement as h } from 'react'
import * as primitives from '@deepseek-ai/dsh-client-ui-primitives'
import { en, zh } from './locales.ts'
import { InstallToast } from './InstallToast.tsx'
import { MarketErrorBoundary } from './ErrorBoundary.tsx'
import { MarketSection } from './MarketSection.tsx'
import { createSectionGate } from './section-gate.ts'
import { exportMarketLog } from './self-check.ts'
import { SettingsCard } from './SettingsCard.tsx'
import type { ThemeSnapshot, Translate } from './market-data.ts'

const NS = 'dsh-market'

/**
 * Primitives this bundle relies on that did not exist before rc.6. The
 * primitives module is host-injected (external at build time), so on an
 * older host the module resolves but these named exports are undefined —
 * rendering would throw and blank the whole settings dialog. Returning the
 * gaps lets apply() skip registration for a clean downgrade instead.
 */
export const REQUIRED_PRIMITIVES = ['Menu', 'DisclosureRow', 'Tooltip', 'Toast'] as const

export function missingPrimitives(mod: Record<string, unknown>, required: readonly string[] = REQUIRED_PRIMITIVES): string[] {
  return required.filter(name => mod[name] === undefined)
}

/**
 * The host surface the settings card needs, present only on rc.7+.
 *
 * The card no longer reads or writes settings — it manages the market's own
 * package — but `settingsScope` stays as the INJECTION KEY, because its
 * presence is what distinguishes a host that has the plugin configuration
 * page from one that does not. The market's namespace (registered in
 * settings.ts) is likewise still required: the page dispatches a card keyed
 * by a namespace it serves, so dropping it would take the card with it.
 */
interface SettingsScopeHost {
  slots: {
    inject(name: string, register: () => unknown): void
    register(options: Record<string, unknown>, render: () => unknown): unknown
  }
}

/** The subset of the theme service this plugin touches. */
interface ThemeService {
  getTheme(): ThemeSnapshot | null
  setTheme(id: string): void
}

/** The subset of the locale service this plugin touches. */
interface LocaleService {
  register(namespace: string, dicts: { zh: Record<string, string>; en: Record<string, string> }): unknown
  bind(namespace: string): Translate
  subscribe(callback: () => void): () => void
  getSnapshot(): { active: string }
}

/** The subset of the slots service this plugin touches. */
interface SlotsService {
  inject(slot: string, register: () => unknown): void
  register(meta: Record<string, unknown>, component: () => unknown): unknown
}

/** The client cordis context shape this plugin relies on (structural: the
 * host provides the real Context; typing the touched surface keeps this
 * external package free of monorepo-internal type dependencies). */
interface MarketClientContext {
  effect(callback: () => unknown, label?: string): void
  on(event: string, callback: () => void): () => void
  locale: LocaleService
  slots: SlotsService
  theme: ThemeService
}

export const name = 'lawyer-market'
export const inject = ['slots', 'locale', 'theme']
export function apply(ctx: MarketClientContext): void {
  ctx.effect(() => ctx.locale.register('lawyer-market', { zh: managedZh, en: managedEn }), 'lawyer-market: locale')
  const t = ctx.locale.bind('lawyer-market') as ManagedTranslate
  ctx.slots.inject('settings.section', () => {
    const a = ctx.slots.register({ name: 'settings.section', id: 'models', order: 30, label: () => t('models'), locale: 'lawyer-market', inject: () => ({ t }) }, () => h(ManagedModelsSection, { t }))
    const b = ctx.slots.register({ name: 'settings.section', id: 'lawyer-market', order: 40, label: () => t('market'), locale: 'lawyer-market', inject: () => ({ t }) }, () => h(ManagedMarketSection, { t }))
    return () => { if (typeof a === 'function') a(); if (typeof b === 'function') b() }
  })
}
