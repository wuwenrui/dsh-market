/** Optional product-plugin UI contract. This event opens a panel only; it never submits an order. */
export const BILLING_OPEN_EVENT = 'lawyer-billing:open'

export function openBillingPanel(target: Pick<Window, 'dispatchEvent'> = window): boolean {
  // The installed billing plugin acknowledges synchronously with preventDefault.
  // An absent plugin is reported to the user, never replaced by an external URL.
  return !target.dispatchEvent(new CustomEvent(BILLING_OPEN_EVENT, { cancelable: true }))
}
