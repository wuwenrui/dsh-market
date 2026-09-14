/** Managed lawyer-market entry. The unrestricted community routes are not mounted. */
import type { Context } from '@deepseek-ai/cordis'
import { mountManagedMarket, type LawyerPlatform } from './managed/routes.ts'
import { ManagedError } from './managed/catalog.ts'
import type { MarketHost } from './routes.ts'

declare module '@deepseek-ai/cordis' { interface Context { lawyerPlatform: LawyerPlatform } }
export const name = 'lawyer-market'
export const inject = ['webServer', 'loader', 'lawyerPlatform']
/** Mount only the managed operations after the product controller is available. */
export function apply(ctx: Context, config?: Record<string, never>): void {
  if (config !== undefined && Object.keys(config).length > 0) throw new ManagedError('PRODUCT_OWNED', '市场配置由产品管理', 403)
  if (ctx.lawyerPlatform === undefined) throw new ManagedError('PLATFORM_REQUIRED', '此市场必须由受管法律产品装载', 403)
  // 一键重启是外壳能力（LawyerDesk 注入 desktopRuntime）；web 形态没有它，
  // 市场界面据此隐藏按钮——插件本身不依赖内核改动，也不强求该能力存在。
  const platform: LawyerPlatform = {
    ...ctx.lawyerPlatform,
    restart: async () => {
      const runtime = (ctx as { get?(name: string): unknown }).get?.('desktopRuntime') as { requestRestart?: () => Promise<void> } | undefined
      if (typeof runtime?.requestRestart !== 'function') return false
      void runtime.requestRestart()
      return true
    },
  }
  ctx.effect(() => mountManagedMarket(ctx as unknown as MarketHost, platform), 'lawyer-market: managed routes')
}
