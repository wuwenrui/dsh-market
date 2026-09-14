import { api } from './market-data.ts'
import { openBillingPanel } from './billing-entry.ts'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Children } from 'react'
import type { ReactNode } from 'react'
import type { ManagedRelease } from '../managed/types.ts'
import styles from './ManagedMarket.module.css'

import type { ManagedTranslate } from './managed-locales.ts'
export { managedZh, managedEn, type ManagedTranslate } from './managed-locales.ts'
interface Status { busy: boolean; stage: string; restartRequired: boolean }
interface Installed { id: string; packageName: string; version: string }
interface Catalog { revision: number; plugins: Array<Omit<ManagedRelease, 'artifact' | 'install'> & { compatible: boolean }> }
interface ModelRow { id: string; name: string; vision: boolean; contextWindow?: number; contextWindowOverride?: number }
/** 表单行：contextText 是输入框里的原文，空串表示「用默认值」。 */
interface ModelFormRow extends ModelRow { contextText: string }
interface Models { site: string; configured: boolean; writable: boolean; models: ModelRow[]; selected: string }
async function request<T>(path: string, body?: unknown): Promise<T> {
  const response = await fetch(api(`dsh-market/${path}`), { method: body === undefined ? 'GET' : 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json', 'x-lawyer-market': '1' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
  const value = await response.json() as T & { error?: string }
  if (!response.ok) throw new Error(value.error ?? 'Request failed')
  return value
}

/** The host's install stages, in order. Anything unknown counts as preparation. */
const STAGES = ['checking', 'authorizing', 'preparing'] as const
const STAGE_LABEL: Record<(typeof STAGES)[number], 'stageChecking' | 'stageAuthorizing' | 'stagePreparing'> = {
  checking: 'stageChecking', authorizing: 'stageAuthorizing', preparing: 'stagePreparing',
}
function stageIndex(stage: string): number {
  const index = (STAGES as readonly string[]).indexOf(stage)
  return index < 0 ? STAGES.length - 1 : index
}

/** One pending mutation, held in state so the dialog can describe it before it runs. */
interface PendingOperation {
  path: 'install' | 'update' | 'uninstall'
  id: string
  name: string
  version: string
  description: string
  category: string
  source: string
  from: string
}

/**
 * Poll `status` until the restart lands.
 *
 * Why this shape: the page lives inside the process being restarted, so a
 * successful restart looks like "no answer for a while, then answers again".
 * We therefore require a stretch of consecutive failures (proof the old
 * process died) before treating the first later success as the new process.
 */
export async function waitForWorkbenchRestart(options: {
  load: () => Promise<Status>
  sleep?: (ms: number) => Promise<void>
  reload?: () => void
  attempts?: number
  pollMs?: number
}): Promise<'restarted' | 'timeout'> {
  const sleep = options.sleep ?? (ms => new Promise(resolve => setTimeout(resolve, ms)))
  const reload = options.reload ?? (() => { window.location.reload() })
  const attempts = options.attempts ?? 90
  const pollMs = options.pollMs ?? 1000
  let sawDowntime = false
  for (let attempt = 0; attempt < attempts; attempt++) {
    await sleep(pollMs)
    try {
      const status = await options.load()
      if (!sawDowntime) continue
      if (status.busy) continue
      reload()
      return 'restarted'
    } catch {
      sawDowntime = true
    }
  }
  return 'timeout'
}

/** The step rail + bar shown while an operation runs. */
function OperationProgress({ t, stage }: { t: ManagedTranslate; stage: string }) {
  const current = stageIndex(stage)
  const total = STAGES.length
  const label = (index: number) => t(STAGE_LABEL[STAGES[index] ?? 'preparing'])
  return <div className={styles.progress} role="status" aria-live="polite">
    <div className={styles.progressHead}><span className={styles.progressTitle}>{t('progress')}</span><span className={styles.progressCount}>{`${t('progressOf')} ${Math.min(current + 1, total)}/${total}`}</span></div>
    <ol className={styles.progressSteps}>
      {STAGES.map((_, index) => <li key={index} className={`${styles.step} ${index === current ? styles.stepOn : ''} ${index < current ? styles.stepDone : ''}`}>
        <span className={styles.stepDot} aria-hidden="true" />
        <span className={styles.stepLabel}>{label(index)}</span>
      </li>)}
    </ol>
    <div className={styles.progressBar} role="progressbar" aria-valuemin={1} aria-valuemax={total} aria-valuenow={Math.min(current + 1, total)}>
      <span className={styles.progressFill} style={{ width: `${Math.round(((current + 1) / total) * 100)}%` }} />
    </div>
    <p className={styles.progressHint}>{t('progressWait')}</p>
  </div>
}

/** Confirmation dialog replacing window.confirm: shows what will change, then asks. */
function ConfirmDialog({ t, pending, busy, onCancel, onConfirm }: {
  t: ManagedTranslate
  pending: PendingOperation
  busy: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  const title = pending.path === 'uninstall' ? t('confirmTitleUninstall') : pending.path === 'update' ? t('confirmTitleUpdate') : t('confirmTitleInstall')
  const run = pending.path === 'uninstall' ? t('confirmRunUninstall') : pending.path === 'update' ? t('confirmRunUpdate') : t('confirmRunInstall')
  const state = pending.path === 'uninstall' ? t('stateInstalled') : pending.path === 'update' ? t('stateUpdatable') : t('stateNotInstalled')
  return <div className={styles.overlay} role="presentation" onClick={busy ? undefined : onCancel}>
    <div className={styles.dialog} role="dialog" aria-modal="true" aria-label={title} onClick={event => event.stopPropagation()}>
      <h3 className={styles.dialogTitle}>{title}</h3>
      <div className={styles.dialogBody}>
        <div className={styles.dialogMeta}>
          <div className={styles.dialogMetaRow}><span className={styles.dialogMetaLabel}>{t('dialogMetaName')}</span><span className={styles.dialogMetaValue}>{pending.name}</span></div>
          <div className={styles.dialogMetaRow}><span className={styles.dialogMetaLabel}>{t('dialogMetaVersion')}</span><span className={styles.dialogMetaValue}>v{pending.version}{pending.from === '' ? '' : ` ← v${pending.from}`}</span></div>
          {pending.category === '' ? null : <div className={styles.dialogMetaRow}><span className={styles.dialogMetaLabel}>{t('dialogMetaCategory')}</span><span className={styles.dialogMetaValue}>{pending.category}</span></div>}
          <div className={styles.dialogMetaRow}><span className={styles.dialogMetaLabel}>{t('dialogMetaSource')}</span><span className={styles.dialogMetaValue}>{pending.source === 'community' ? t('community') : t('owned')}</span></div>
          <div className={styles.dialogMetaRow}><span className={styles.dialogMetaLabel}>{t('dialogMetaState')}</span><span className={styles.dialogMetaValue}>{state}</span></div>
        </div>
        {pending.description === '' ? null : <p className={styles.description}>{pending.description}</p>}
        <p className={styles.dialogNote}>{pending.path === 'uninstall' ? t('confirmNoteUninstall') : t('confirmNote')}</p>
      </div>
      <div className={styles.dialogActions}>
        <button type="button" className={styles.dialogGhost} onClick={onCancel} disabled={busy}>{t('cancel')}</button>
        <button type="button" autoFocus className={pending.path === 'uninstall' ? styles.dialogDanger : styles.dialogPrimary} onClick={onConfirm} disabled={busy}>{run}</button>
      </div>
    </div>
  </div>
}

/** Restart banner: the only path from "installed" to "usable", so it carries a button. */
function RestartBanner({ t, phase, onRestart }: { t: ManagedTranslate; phase: 'idle' | 'restarting' | 'done' | 'timeout' | 'unavailable'; onRestart: () => void }) {
  const message = phase === 'restarting' ? t('restartWaiting') : phase === 'done' ? t('restartDone') : phase === 'timeout' ? t('restartTimeout') : phase === 'unavailable' ? t('restartUnavailable') : ''
  return <div className={styles.alert} data-kind="warning" role="status">
    <div className={styles.restartHead}><strong className={styles.alertTitle}>{t('restartTitle')}</strong><span className={styles.badge} data-kind="installed">{t('pending')}</span></div>
    <p className={styles.alertBody}>{t('restartBody')}</p>
    <p className={styles.alertHint}>{t('uninstallAvailableHint')}</p>
    {message === '' ? null : <p className={styles.alertHint} aria-live="polite">{message}</p>}
    {phase === 'idle' || phase === 'timeout' ? <div className={styles.alertActions}>
      <button type="button" className={styles.actionPrimary} onClick={onRestart}>{t('restartNow')}</button>
    </div> : null}
  </div>
}

/**
 * Card columns that follow the container, not the viewport.
 *
 * The same section renders in a ~600px settings dialog (desktop) and a wide
 * Web workbench, so a viewport media query would give the narrow dialog two
 * cramped columns. Cards are dealt alternately into the columns to keep the
 * left-to-right reading order the catalog is sorted in.
 */
function useCardColumns() {
  const ref = useRef<HTMLElement | null>(null)
  const [count, setCount] = useState(1)
  useEffect(() => {
    const element = ref.current
    if (element === null || typeof ResizeObserver === 'undefined') return
    const measure = (width: number) => setCount(width >= 640 ? 2 : 1)
    measure(element.clientWidth)
    const observer = new ResizeObserver(entries => measure(entries[0]?.contentRect.width ?? element.clientWidth))
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  return { ref, count }
}

/** Lay cards out in one or two balanced columns. */
function CardColumns({ count, children }: { count: number; children: ReactNode }) {
  const items = Children.toArray(children)
  const buckets: ReactNode[][] = Array.from({ length: Math.max(1, count) }, () => [])
  items.forEach((child, index) => buckets[index % buckets.length]!.push(child))
  return <div className={styles.columns}>{buckets.map((bucket, index) => <div className={styles.column} key={index}>{bucket}</div>)}</div>
}

/**
 * One capability card: category mark, name, meta line, clamped description,
 * and the action pinned to the top-right — the same reading order as the
 * market's own cards, so the two surfaces do not feel like different products.
 */
function CapabilityCard({ category, name, meta, description, badges, action }: {
  category: string
  name: string
  meta: string
  description: string
  badges: ReactNode
  action: ReactNode
}) {
  const mark = category.trim() === '' ? name.trim().slice(0, 1) : category.trim().slice(0, 1)
  return <article className={styles.card}>
    <span className={styles.mark} aria-hidden="true">{mark}</span>
    <div className={styles.cardMain}>
      <div className={styles.cardHead}>
        <h4 className={styles.name}>{name}</h4>
        {badges}
      </div>
      <p className={styles.meta}>{meta}</p>
      {description === '' ? null : <p className={styles.description}>{description}</p>}
    </div>
    <div className={styles.cardActions}>{action}</div>
  </article>
}

export function ManagedMarketSection({ t }: { t: ManagedTranslate }) {
  const [catalog, setCatalog] = useState<Catalog | null>(null), [installed, setInstalled] = useState<Installed[]>([])
  const [status, setStatus] = useState<Status>({ busy: false, stage: 'idle', restartRequired: false })
  const [error, setError] = useState(''), [operationError, setOperationError] = useState(''), [busy, setBusy] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [pending, setPending] = useState<PendingOperation | null>(null)
  const [restartPhase, setRestartPhase] = useState<'idle' | 'restarting' | 'done' | 'timeout' | 'unavailable'>('idle')
  const [tab, setTab] = useState<'installed' | 'available'>('installed')
  /** 只在首次加载时定默认页：什么都没装的人该直接看到可装的东西，
   *  已经装过的人该先看到自己装了什么。用户点过 tab 之后就不再自动切。 */
  const tabPinned = useRef(false)
  const [query, setQuery] = useState('')
  const layout = useCardColumns()
  const [toast, setToast] = useState('')
  /** Guards the polling effect so a re-render never starts a second restart. */
  const restartingRef = useRef(false)
  const load = async () => {
    setError('')
    const current = await request<{ installed: Installed[] } & Status>('installed')
    setInstalled(current.installed); setStatus(current)
    if (!tabPinned.current && current.installed.length === 0) setTab('available')
    try { setCatalog(await request<Catalog>('registry')) } catch (e) { setCatalog(null); setError(String(e instanceof Error ? e.message : e)) }
  }
  useEffect(() => {
    setToast(sessionStorage.getItem('dshm-managed-toast') ?? '')
    sessionStorage.removeItem('dshm-managed-toast')
    void load().catch(e => setError(String(e)))
  }, [])
  useEffect(() => {
    if (!busy) return
    const timer = setInterval(() => { void request<Status>('status').then(setStatus).catch(() => undefined) }, 700)
    return () => clearInterval(timer)
  }, [busy])
  const run = async () => {
    const operation = pending
    if (operation === null) return
    setPending(null); setBusy(true); setOperationError('')
    try {
      await request(operation.path, { id: operation.id, version: operation.version })
      await load()
      // 安装/更新完成后留下「重启生效」的提示；卸载不需要重启
      if (operation.path !== 'uninstall') sessionStorage.setItem('dshm-managed-pending-restart', '1')
    } catch (e) { setOperationError(e instanceof Error ? e.message : String(e)) } finally { setBusy(false) }
  }
  const startRestart = async () => {
    if (restartingRef.current) return
    restartingRef.current = true
    setRestartPhase('restarting')
    try {
      await request('restart', {})
    } catch (e) {
      restartingRef.current = false
      // 形态不支持时不重复两遍（横幅已有一句提示），只把后端原因留在错误区
      setRestartPhase('unavailable')
      const reason = e instanceof Error ? e.message : String(e)
      setOperationError(reason === t('restartUnavailable') ? '' : reason)
      return
    }
    const outcome = await waitForWorkbenchRestart({ load: () => request<Status>('status') })
    restartingRef.current = false
    if (outcome === 'timeout') { setRestartPhase('timeout'); return }
    sessionStorage.setItem('dshm-managed-toast', t('restartSuccessToast'))
    setRestartPhase('done')
  }
  const refresh = async () => {
    setRefreshing(true)
    try { await load() } catch (e) { setError(String(e instanceof Error ? e.message : e)) } finally { setRefreshing(false) }
  }
  const askInstall = (item: Catalog['plugins'][number], current: Installed | undefined) => setPending({
    path: current === undefined ? 'install' : 'update', id: item.id, name: item.name, version: item.version,
    description: item.description, category: item.category, source: item.source, from: current?.version ?? '',
  })
  const askUninstall = (item: Installed) => setPending({
    path: 'uninstall', id: item.id,
    name: catalog?.plugins.find(p => p.id === item.id)?.name ?? item.id,
    version: item.version, description: '', category: '', source: 'owned', from: item.version,
  })

  const locked = busy || status.restartRequired
  const keyword = query.trim().toLowerCase()
  const match = (fields: Array<string | undefined>) => keyword === '' || fields.some(field => String(field ?? '').toLowerCase().includes(keyword))
  const installedRows = installed
    .filter(item => match([item.id, catalog?.plugins.find(p => p.id === item.id)?.name, catalog?.plugins.find(p => p.id === item.id)?.category, catalog?.plugins.find(p => p.id === item.id)?.description]))
  const availableRows = (catalog?.plugins ?? []).filter(item => match([item.id, item.name, item.category, item.description]))
  const updatableCount = installed.filter(item => catalog?.plugins.find(p => p.id === item.id)?.version !== undefined && catalog.plugins.find(p => p.id === item.id)?.version !== item.version).length
  return <section className={styles.root} aria-label={t('market')} ref={layout.ref}>
    <header className={styles.header}>
      <div>
        <h2 className={styles.title}>{t('market')}</h2>
        <p className={styles.subtitle}>{t('managed')}</p>
      </div>
      <div className={styles.headerActions}>
        <button type="button" className={styles.actionGhost} onClick={() => void refresh()} disabled={busy || refreshing}>{refreshing ? t('refreshing') : t('retry')}</button>
      </div>
    </header>

    {toast === '' ? null : <div className={styles.alert} data-kind="success" role="status"><p className={styles.alertBody}>{toast}</p></div>}
    {status.restartRequired ? <RestartBanner t={t} phase={restartPhase} onRestart={() => void startRestart()} /> : null}
    {busy ? <OperationProgress t={t} stage={status.stage} /> : null}
    {operationError === '' ? null : <div className={styles.alert} data-kind="danger" role="alert"><p className={styles.alertBody}>{operationError}</p></div>}

    {/* 已安装 / 可安装用 tab 分开：装完的东西留在「可安装」里会让人以为没装上，
        也让「有更新」这件事被列表淹没。搜索只过滤当前这一屏。 */}
    <div className={styles.toolbar} role="tablist" aria-label={t('market')}>
      <button type="button" role="tab" aria-selected={tab === 'installed'} className={tab === 'installed' ? styles.tabActive : styles.tab}
        onClick={() => { tabPinned.current = true; setTab('installed') }}>
        {t('installed')}<span className={styles.tabCount}>{installed.length}</span>
        {updatableCount > 0 ? <span className={styles.tabBadge}>{updatableCount} {t('stateUpdatable')}</span> : null}
      </button>
      <button type="button" role="tab" aria-selected={tab === 'available'} className={tab === 'available' ? styles.tabActive : styles.tab}
        onClick={() => { tabPinned.current = true; setTab('available') }}>
        {t('available')}<span className={styles.tabCount}>{catalog?.plugins.length ?? 0}</span>
      </button>
      <label className={styles.search}>
        <input type="search" value={query} placeholder={t('searchPlaceholder')} aria-label={t('search')} onChange={event => setQuery(event.target.value)} />
      </label>
    </div>

    {tab === 'installed' ? <section className={styles.section} aria-label={t('installed')}>
      {installed.length === 0
        ? <div className={styles.emptyCard}><p className={styles.emptyTitle}>{t('emptyInstalledTitle')}</p><p className={styles.emptyHint}>{t('emptyInstalledHint')}</p></div>
        : installedRows.length === 0
          ? <p className={styles.muted}>{t('searchEmpty')}</p>
          : <CardColumns count={layout.count}>{installedRows.map(item => {
            const known = catalog?.plugins.find(p => p.id === item.id)
            const updatable = known !== undefined && known.version !== item.version
            return <CapabilityCard
              key={item.id}
              category={known?.category ?? ''}
              name={known?.name ?? item.id}
              meta={`${t('installedVersion')} v${item.version}${updatable ? ` · ${t('updateTo')} v${known.version}` : ''}`}
              description={known?.description ?? ''}
              badges={<>
                <span className={styles.badge} data-kind="installed">{t('stateInstalled')}</span>
                {updatable ? <span className={styles.badge} data-kind="update">{t('stateUpdatable')}</span> : null}
              </>}
              action={<>
                <button type="button" className={styles.actionGhost} onClick={() => askUninstall(item)} disabled={busy}>{t('remove')}</button>
                {updatable ? <button type="button" className={styles.actionPrimary} onClick={() => askInstall(known, item)} disabled={locked}>{t('update')}</button> : null}
              </>}
            />
          })}</CardColumns>}
    </section> : <section className={styles.section} aria-label={t('available')}>
      {error === '' ? null : <div className={styles.alert} data-kind="danger" role="alert">
        <strong className={styles.alertTitle}>{t('errorTitle')}</strong>
        <p className={styles.alertBody}>{error}</p>
        <p className={styles.alertHint}>{t('noFallback')}</p>
        <div className={styles.alertActions}><button type="button" className={styles.actionGhost} onClick={() => void refresh()}>{t('retryAction')}</button></div>
      </div>}
      {catalog === null && error === '' ? <p className={styles.muted}>{t('loading')}</p> : null}
      {catalog !== null && catalog.plugins.length === 0 ? <p className={styles.muted}>{t('empty')}</p> : null}
      {catalog !== null && catalog.plugins.length > 0 && availableRows.length === 0 ? <p className={styles.muted}>{t('searchEmpty')}</p> : null}
      <CardColumns count={layout.count}>{availableRows.map(item => {
        const current = installed.find(p => p.id === item.id), same = current?.version === item.version
        return <CapabilityCard
          key={item.id}
          category={item.category}
          name={item.name}
          meta={`${item.category} · v${item.version}`}
          description={item.description}
          badges={<>
            <span className={styles.badge} data-kind={item.source === 'community' ? 'community' : 'owned'}>{t(item.source === 'community' ? 'community' : 'owned')}</span>
            {same ? <span className={styles.badge} data-kind="installed">{t('stateInstalled')}</span> : null}
          </>}
          action={<button type="button" className={same || !item.compatible ? styles.actionGhost : styles.actionPrimary}
            onClick={() => askInstall(item, current)}
            disabled={locked || same || !item.compatible}>
            {!item.compatible ? t('incompatible') : same ? t('stateInstalled') : current === undefined ? t('install') : t('update')}
          </button>}
        />
      })}</CardColumns>
    </section>}

    {catalog === null ? null : <footer className={styles.footer}><span className={styles.muted}>{t('revision')} {catalog.revision}</span></footer>}

    {pending === null ? null : <ConfirmDialog t={t} pending={pending} busy={busy} onCancel={() => setPending(null)} onConfirm={() => void run()} />}
  </section>
}
export function ManagedModelsSection({ t }: { t: ManagedTranslate }) {
  const [data, setData] = useState<Models | null>(null), [key, setKey] = useState(''), [selected, setSelected] = useState('')
  const [rows, setRows] = useState<ModelFormRow[]>([]), [message, setMessage] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false)
  const apply = (next: Models) => {
    setData(next); setSelected(next.selected)
    // 输入框显示的是「用户自己填过的那份声明」，不是当前生效值：把默认值填进输入框，
    // 用户一保存就变成了显式覆盖，之后再改默认值也影响不到他。
    setRows(next.models.map(model => ({ ...model, vision: model.vision === true, contextText: model.contextWindowOverride === undefined ? '' : String(model.contextWindowOverride) })))
  }
  const load = async () => apply(await request<Models>('models'))
  useEffect(() => { void load().catch(e => setError(String(e))) }, [])
  /**
   * 写接口的返回形态不同：save-models / refresh-models 回整套模型状态，
   * credential / select-model 只回 {ok:true}。只有前者能就地套用返回值，
   * 其余统一重新拉一次状态——不能假定每个写接口都回同一份 payload
   * （第一版就假定错了，web 形态下保存令牌会直接卡在无反应）。
   */
  const action = async (path: string, body: unknown, ok: 'saved' | 'savedModel' | 'savedModels' | 'savedOk') => {
    setBusy(true); setError(''); setMessage('')
    try {
      const value = await request<Models & { ok?: boolean }>(path, body)
      const isStatus = typeof (value as Models)?.selected === 'string' && Array.isArray((value as Models)?.models)
      if (isStatus) apply(value as Models)
      else await load()
      if (path === 'credential') setKey('')
      setMessage(t(ok))
    } catch (e) { setError(e instanceof Error ? e.message : String(e)) } finally { setBusy(false) }
  }
  const visionCount = useMemo(() => rows.filter(row => row.vision).length, [rows])
  /**
   * 提交前把上下文窗口的原文解析成正整数：空串 = 不声明（回落默认），
   * 其余必须能原样解析，非法就停在本地报错——不能让宿主替我们猜。
   */
  const collectModelSpecs = (): Array<Record<string, unknown>> | null => {
    const models: Array<Record<string, unknown>> = []
    for (const row of rows) {
      const text = row.contextText.trim()
      const spec: Record<string, unknown> = { id: row.id, name: row.name, vision: row.vision }
      if (text !== '') {
        const value = Number(text)
        if (!/^\d+$/.test(text) || !Number.isSafeInteger(value) || value <= 0) { setError(t('contextInvalid')); return null }
        spec.contextWindow = value
      }
      models.push(spec)
    }
    return models
  }
  const saveModels = () => {
    const models = collectModelSpecs()
    if (models !== null) void action('save-models', { models }, 'savedModels')
  }
  return <section className={styles.root} aria-label={t('models')}>
    <header className={styles.header}><div><h2 className={styles.title}>{t('models')}</h2><p className={styles.subtitle}>{t('fixed')}</p></div></header>
    <p className={styles.footnote}><strong>{t('site')}</strong> · <button type="button" className={styles.actionGhost} onClick={() => { setError(''); if (!openBillingPanel()) setError(t('billingMissing')) }}>{t('account')}</button></p>
    {error === '' ? null : <div className={styles.alert} data-kind="danger" role="alert"><p className={styles.alertBody}>{error}</p></div>}
    {message === '' ? null : <div className={styles.alert} data-kind="success" role="status"><p className={styles.alertBody}>{message}</p></div>}
    <p className={styles.footnote}>{data?.configured ? t('configured') : t('missing')}</p>
    {data?.writable === false ? <p className={styles.locked}>{t('readonly')}</p> : null}
    <form className={styles.form} onSubmit={event => { event.preventDefault(); void action('credential', { key }, 'saved') }}>
      <label className={styles.label}>{t('key')}<input type="password" autoComplete="new-password" value={key} onChange={e => setKey(e.target.value)} disabled={busy || data?.writable === false} /></label>
      <button type="submit" className={styles.actionPrimary} disabled={busy || key.trim().length === 0 || data?.writable === false}>{t('save')}</button>
    </form>
    <div className={styles.cardActions}>
      <button type="button" className={styles.actionGhost} disabled={busy || data?.configured !== true} onClick={() => void action('refresh-models', {}, 'savedOk')}>{t('refresh')}</button>
    </div>
    {data !== null && data.models.length > 0
      ? <>
        <form className={styles.form} onSubmit={event => { event.preventDefault(); void action('select-model', { model: selected }, 'savedModel') }}>
          <label className={styles.label}>{t('select')}<select value={selected} onChange={e => setSelected(e.target.value)}>{data.models.map(model => <option key={model.id} value={model.id}>{model.name}</option>)}</select></label>
          <button type="submit" className={styles.actionPrimary} disabled={busy || selected === ''}>{t('choose')}</button>
        </form>
        {/* 能力清单是图片准入与上下文容量的唯一开关：内核按 inputModalities 拦附件、
            按 contextWindow 判溢出，界面必须能逐条声明，否则只能靠手改 settings.yaml。 */}
        <fieldset className={styles.visionGroup}>
          <legend className={styles.visionLegend}>{t('visionTitle')}<span className={styles.visionCount}>· {t('modelCount')} {data.models.length} · {t('visionOn')} {visionCount}</span></legend>
          <p className={styles.visionHint}>{t('visionHint')}</p>
          <p className={styles.visionHint}>{t('contextHint')}</p>
          <div className={styles.visionRows}>
            {rows.map((row, index) => <div key={row.id} data-model-id={row.id} className={styles.visionRow}>
              <label className={styles.visionCheck}>
                <input type="checkbox" checked={row.vision} disabled={busy} onChange={e => setRows(list => list.map((item, at) => at === index ? { ...item, vision: e.target.checked } : item))} />
                <span className={styles.visionName}>{row.name}</span>
                <span className={styles.visionState}>{row.vision ? t('visionOn') : t('visionOff')}{row.id === data.selected ? ` · ${t('modelSelected')}` : ''}</span>
              </label>
              <label className={styles.contextField}>
                <span className={styles.contextLabel}>{t('contextField')}</span>
                <input
                  className={styles.contextInput}
                  type="number" min={1} step={1024} inputMode="numeric"
                  value={row.contextText}
                  placeholder={row.contextWindow === undefined ? t('visionDefault') : String(row.contextWindow)}
                  disabled={busy}
                  onChange={e => setRows(list => list.map((item, at) => at === index ? { ...item, contextText: e.target.value } : item))}
                />
                <span className={styles.contextUnit}>{t('contextUnit')}</span>
              </label>
            </div>)}
          </div>
          <div className={styles.visionActions}>
            <button type="button" className={styles.actionPrimary} disabled={busy || rows.length === 0} onClick={saveModels}>{t('saveModels')}</button>
          </div>
        </fieldset>
      </>
      : <p className={styles.footnote}>{t('none')}</p>}
  </section>
}
