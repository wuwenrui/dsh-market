import { describe, expect, it } from 'vitest'
import { BILLING_OPEN_EVENT, openBillingPanel } from '../src/client/billing-entry.ts'

describe('embedded billing entry contract', () => {
  it('reports absent plugin without opening any external URL', () => {
    const target = new EventTarget()
    expect(openBillingPanel(target)).toBe(false)
  })
  it('opens only the installed plugin UI and respects listener disposal', () => {
    const target = new EventTarget()
    let opened = 0
    const listener = (event: Event) => { opened++; event.preventDefault() }
    target.addEventListener(BILLING_OPEN_EVENT, listener)
    expect(openBillingPanel(target)).toBe(true)
    expect(opened).toBe(1)
    target.removeEventListener(BILLING_OPEN_EVENT, listener)
    expect(openBillingPanel(target)).toBe(false)
    expect(opened).toBe(1)
  })
})
