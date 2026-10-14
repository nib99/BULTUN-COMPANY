/**
 * Manual payment rules. A receipt is not settlement.
 * Entitlements are granted once per order (database unique on order_id).
 * The reviewer must not be the buyer; the payment_reviews trigger enforces that.
 */

export type ReviewDecision = "approved" | "rejected" | "needs_evidence";

export function reviewerMayDecide(orderUserId: string, reviewerUserId: string): boolean {
  return orderUserId !== reviewerUserId && orderUserId.length > 0 && reviewerUserId.length > 0;
}

/** Second approval of the same order must not insert another entitlement. */
export function entitlementAction(alreadyGranted: boolean): "insert" | "noop" {
  return alreadyGranted ? "noop" : "insert";
}

const PAYMENT_ROLES = new Set(["admin", "super_admin", "platform_owner"]);

export function canDecidePayments(roles: readonly string[]): boolean {
  return roles.some((role) => PAYMENT_ROLES.has(role));
}
