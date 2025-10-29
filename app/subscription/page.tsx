"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  useCreditsQuery,
  useCheckoutMutation,
  useSubscriptionQuery,
  usePlansQuery,
  useCancelSubscriptionMutation,
} from "@/store/api";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Card, CardBody, Skeleton } from "@heroui/react";
import { CardHeader } from "@heroui/card";

/* ---------- tiny date formatter ---------- */
function fmt(d?: string | Date | null) {
  if (!d) return null;
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/* ---------- subscription status line ---------- */
function SubLine({ sub }: { sub: any }) {
  if (!sub || !sub.status || sub.status === "none") return <span>No active subscription.</span>;

  // Trial
  if (sub.status === "trialing" && sub.trial_end) {
    const t = fmt(sub.trial_end);
    return (
      <span>
        Trial ends on <b>{t}</b>. First charge then.
      </span>
    );
  }

  // Paused
  if (sub.paused) {
    const until = fmt(sub.ends_on || sub.renews_on);
    return (
      <span>
        Paused. Access until <b>{until ?? "—"}</b>.
      </span>
    );
  }

  // Cancel scheduled
  if (sub.cancel_at_period_end && sub.ends_on) {
    return (
      <span>
        Ends on <b>{fmt(sub.ends_on)}</b>.
      </span>
    );
  }

  // Payment issue
  if ((sub.status === "past_due" || sub.status === "unpaid") && sub.next_payment_attempt) {
    return (
      <span>
        Payment issue. We’ll retry by <b>{fmt(sub.next_payment_attempt)}</b>.
      </span>
    );
  }

  // Active & renewing
  if (sub.will_renew && sub.renews_on) {
    return (
      <span>
        Renews on <b>{fmt(sub.renews_on)}</b>.
      </span>
    );
  }

  return <span>Status: {sub.status}</span>;
}

/* ---------- skeleton for plan tiles ---------- */
function PlanCardSkeleton() {
  return (
    <div className="border rounded p-3">
      <Skeleton className="h-5 w-1/2 rounded mb-2" />
      <Skeleton className="h-4 w-2/3 rounded" />
    </div>
  );
}

/* ---------- feature helpers ---------- */

/**
 * Build the bullet list for a SUBSCRIPTION plan card.
 * We combine actual flags/fields from backend (unlimited_swipes, see_who_liked, boosts_per_week, superlikes_per_period, etc.)
 * and we also try to give nicer marketing text for known intervals (weekly/monthly/yearly).
 *
 * If backend already returns these fields in `plans`, we use them.
 * If backend does NOT return these, you should add them to Plan in DB or to Stripe metadata;
 * see discussion after the component.
 */
function getSubscriptionFeatures(p: any): string[] {
  const features: string[] = [];

  // from DB booleans / numeric perks
  if (p.unlimited_swipes) features.push("Unlimited swipes");
  if (p.see_who_liked) features.push("See who liked you");
  if (p.priority_support) features.push("Priority customer support");
  if (p.badge) features.push("Exclusive badge on profile");

  // credits bundled over time
  if (typeof p.superlikes_per_period === "number" && p.superlikes_per_period > 0) {
    // Try to express this like "5 super likes per week/month"
    const periodLabel = p.superlike_period || p.interval || "period";
    features.push(`${p.superlikes_per_period} super likes per ${periodLabel}`);
  }

  if (typeof p.boosts_per_week === "number" && p.boosts_per_week > 0) {
    features.push(`${p.boosts_per_week} profile boosts per week`);
  }

  // Extra marketing layer based on plan slug/name, if we want parity with your static config:
  // (Weekly, Monthly, Yearly)
  // We only add these if the explicit fields above didn't already cover them.
  const nameLower = String(p.name || p.plan_slug || "").toLowerCase();

  if (nameLower.includes("weekly")) {
    // Weekly plan in your spec:
    //  - Unlimited swipes
    //  - See who liked you
    //  - 5 super likes per week
    //  - Basic profile boosts
    if (!features.find((f) => f.toLowerCase().includes("unlimited swipes"))) {
      features.push("Unlimited swipes");
    }
    if (!features.find((f) => f.toLowerCase().includes("see who liked"))) {
      features.push("See who liked you");
    }
    if (
      !features.find((f) => f.toLowerCase().includes("super like")) &&
      !features.find((f) => f.toLowerCase().includes("super likes"))
    ) {
      features.push("5 super likes per week");
    }
    if (!features.find((f) => f.toLowerCase().includes("boost"))) {
      features.push("Basic profile boosts");
    }
  }

  if (nameLower.includes("monthly")) {
    // Monthly plan in your spec:
    //  - Everything in Weekly
    //  - 10 super likes per month
    //  - 1 profile boost per week
    //  - Priority customer support
    if (!features.find((f) => f.toLowerCase().includes("everything in weekly"))) {
      features.push("Everything in Weekly");
    }
    if (
      !features.find((f) => f.toLowerCase().includes("super like")) &&
      !features.find((f) => f.toLowerCase().includes("super likes"))
    ) {
      features.push("10 super likes per month");
    }
    if (
      !features.find((f) => f.toLowerCase().includes("boost")) &&
      !features.find((f) => f.toLowerCase().includes("profile boost"))
    ) {
      features.push("1 profile boost per week");
    }
    if (
      !features.find((f) => f.toLowerCase().includes("priority customer support")) &&
      p.priority_support !== false // if backend didn't already include
    ) {
      features.push("Priority customer support");
    }
  }

  if (nameLower.includes("yearly")) {
    // Yearly plan in your spec:
    //  - Everything in Monthly
    //  - Unlimited super likes
    //  - 3 profile boosts per week
    //  - Exclusive badge on profile
    //  - Save 45% compared to monthly
    if (!features.find((f) => f.toLowerCase().includes("everything in monthly"))) {
      features.push("Everything in Monthly");
    }
    if (
      !features.find((f) => f.toLowerCase().includes("unlimited super likes")) &&
      !features.find((f) => f.toLowerCase().includes("super like"))
    ) {
      features.push("Unlimited super likes");
    }
    if (
      !features.find((f) => f.toLowerCase().includes("profile boost")) &&
      !features.find((f) => f.toLowerCase().includes("boost"))
    ) {
      features.push("3 profile boosts per week");
    }
    if (!features.find((f) => f.toLowerCase().includes("exclusive badge")) && p.badge !== false) {
      features.push("Exclusive badge on profile");
    }
    if (!features.find((f) => f.toLowerCase().includes("save 45%"))) {
      features.push("Save 45% compared to monthly");
    }
  }

  return features;
}

/**
 * Build the bullet list for a ONE-TIME PACK card.
 * Uses plan.credit_type / credit_quantity, description, etc.
 * We’ll also try to format them similarly to your `oneTimePackages` list.
 */
function getPackFeatures(p: any): string[] {
  const feats: string[] = [];

  // If backend includes `description`, include that.
  if (p.description) {
    feats.push(p.description);
  }

  // If backend includes credit info (credit_type / credit_quantity),
  // show “Get 25 super likes …”
  if (p.credit_type && p.credit_quantity > 0) {
    if (p.credit_type === "superlike") {
      feats.push(`Get ${p.credit_quantity} super likes to stand out`);
    } else if (p.credit_type === "boost") {
      feats.push(`Boost your profile visibility (${p.credit_quantity} boosts)`);
    } else if (p.credit_type === "premium") {
      feats.push(`${p.credit_quantity} premium tokens / premium features without subscription`);
    }
  }

  // Fallback marketing if plan_slug name matches expectations
  const nameLower = String(p.name || p.plan_slug || "").toLowerCase();
  if (feats.length === 0) {
    if (nameLower.includes("super")) {
      feats.push("Get super likes to stand out from the crowd");
    } else if (nameLower.includes("boost")) {
      feats.push("Boost your profile to get more matches fast");
    } else if (nameLower.includes("premium")) {
      feats.push("Unlock premium features without a subscription");
    }
  }

  return feats;
}

export default function SubscriptionPage() {
  const router = useRouter();
  const params = useSearchParams();

  // we still parse ?status=success / ?status=cancel for UI banners,
  // but we no longer use session_id to call /stripe/confirm
  const initialStatus = useRef<"success" | "cancel" | null>(
    (params.get("status") as "success" | "cancel" | null) ?? null,
  );

  // queries
  const {
    data: credits,
    refetch: refetchCredits,
    isLoading: creditsLoading,
    isFetching: creditsFetching,
  } = useCreditsQuery();

  const {
    data: sub,
    refetch: refetchSub,
    isLoading: subLoading,
    isFetching: subFetching,
  } = useSubscriptionQuery();

  const { data: plans, isLoading: plansLoading, isFetching: plansFetching } = usePlansQuery();

  const [checkout] = useCheckoutMutation();
  const [cancelSub, { isLoading: canceling }] = useCancelSubscriptionMutation();

  // canCancel / canResume logic stays
  const canCancel =
    !!sub &&
    (sub.status === "active" || sub.status === "trialing" || sub.status === "past_due") &&
    !sub.cancel_at_period_end;

  const canResume =
    !!sub &&
    (sub.status === "active" || sub.status === "trialing" || sub.status === "past_due") &&
    sub.cancel_at_period_end;

  const loadingCredits = creditsLoading || creditsFetching;
  const loadingSub = subLoading || subFetching;
  const loadingPlans = plansLoading || plansFetching;

  /**
   * Poll AFTER success redirect just to wait for the webhook write.
   * Super lightweight: try a few times, then stop.
   * This is only to improve perceived "finalizing..." UX.
   *
   * NOTE:
   * - We are NOT calling /stripe/confirm anymore.
   * - We're just refreshing sub + credits a couple times.
   */
  useEffect(() => {
    if (initialStatus.current !== "success") return;

    let cancelled = false;
    let tries = 0;

    async function poll() {
      tries += 1;
      await Promise.all([refetchSub(), refetchCredits()]);
      const ready = !!sub?.status && sub.status !== "none";
      if (!cancelled && !ready && tries < 6) {
        setTimeout(poll, 1000);
      }
    }

    const t = setTimeout(poll, 600);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refetchSub, refetchCredits]);

  // Once we read params for banner, clean them out of the URL
  useEffect(() => {
    if (params.toString()) {
      router.replace("/subscription");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Resolve the currently active plan
  const activePlan = useMemo(() => {
    const list = Array.isArray(plans) ? (plans as any[]) : [];
    if (!sub) return null;
    if (sub.plan_price_id) {
      const m = list.find((p) => p.price_id === sub.plan_price_id);
      if (m) return m;
    }
    if (sub.plan_slug) {
      const m = list.find((p) => p.plan_slug === sub.plan_slug);
      if (m) return m;
    }
    return null;
  }, [plans, sub]);

  // Should show green "finalizing..." banner?
  const showFinalizing =
    initialStatus.current === "success" &&
    (!sub?.status || sub.status === "none" || sub.status === "incomplete");

  async function buy(plan_slug: string, price_id: string) {
    const { data } = await checkout({ plan: plan_slug, price_id } as any);
    if (data?.url) {
      window.location.href = data.url;
    }
  }

  // Break plans into subs vs packs
  const list = Array.isArray(plans) ? (plans as any[]) : [];
  const subsOnly = list.filter((p) => p.plan_type === "subscription");
  const packsOnly = list.filter((p) => p.plan_type === "one_time");

  // helper: is this subscription card the one the user currently has
  const isCurrentPlan = (p: any) =>
    !!sub &&
    !!sub.plan_price_id &&
    sub.plan_price_id === p.price_id &&
    sub.status !== "canceled" &&
    sub.status !== "incomplete_expired";

  // cancel / resume handlers
  async function onCancel() {
    const ok = window.confirm(
      "Cancel auto-renew? You'll keep access until the end of the current period.",
    );
    if (!ok) return;
    try {
      await cancelSub({}).unwrap();
      await refetchSub();
    } catch (e) {
      console.error(e);
    }
  }

  async function onResume() {
    const ok = window.confirm("Enable auto-renew again?");
    if (!ok) return;
    try {
      await cancelSub({ enable: true }).unwrap();
      await refetchSub();
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <Card>
      <CardBody>
        <div className="space-y-6">
          <CardHeader className="pb-0 pt-2 px-4 flex-col items-start">
            <h1 className="text-xl font-semibold">Subscription</h1>
          </CardHeader>

          {/* Finalizing / Canceled banners */}
          <div className="min-h-[40px]">
            {showFinalizing ? (
              <div className="text-sm rounded bg-green-50 border border-green-200 p-2">
                Payment successful. Finalizing your account…
              </div>
            ) : initialStatus.current === "cancel" ? (
              <div className="text-sm rounded bg-yellow-50 border border-yellow-200 p-2">
                Payment canceled.
              </div>
            ) : null}
          </div>

          {/* Status line */}
          <div className="text-sm min-h-[24px] flex items-center">
            {loadingSub ? (
              <Skeleton className="h-4 w-2/3 rounded" />
            ) : (
              <>
                Status: {sub?.status || "none"}{" "}
                {sub ? (
                  <>
                    &nbsp;·&nbsp;
                    <SubLine sub={sub} />
                  </>
                ) : null}
              </>
            )}
          </div>

          {/* Current package */}
          <div className="text-sm min-h-[22px]">
            {loadingSub || loadingPlans ? (
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-40 rounded" />
                <Skeleton className="h-4 w-24 rounded" />
                <Skeleton className="h-4 w-20 rounded" />
              </div>
            ) : activePlan ? (
              <div>
                Current package: <b>{activePlan.name || activePlan.plan_slug}</b>
                {" — "}
                {(activePlan.unit_amount / 100).toFixed(2)} {activePlan.currency}
                {activePlan.plan_type === "subscription" && activePlan.interval
                  ? ` / ${activePlan.interval}`
                  : ""}
              </div>
            ) : (
              <div>No current package.</div>
            )}
          </div>

          {/* Cancel / Resume row */}
          <div className="min-h-[40px] flex items-center">
            {loadingSub ? (
              <div className="flex gap-2">
                <Skeleton className="h-9 w-80 rounded" />
                <Skeleton className="h-9 w-12 rounded" />
              </div>
            ) : canCancel ? (
              <Button
                size="sm"
                color="danger"
                onPress={onCancel}
                isDisabled={canceling}
                isLoading={canceling}
                title="Stop future renewals; you keep access until your current period ends."
              >
                {canceling ? "Cancelling…" : "Cancel auto-renew"}
              </Button>
            ) : canResume ? (
              <Button
                size="sm"
                color="primary"
                onPress={onResume}
                isDisabled={canceling}
                isLoading={canceling}
                title="Turn auto-renew back on."
              >
                {canceling ? "Enabling…" : "Enable auto-renew"}
              </Button>
            ) : sub?.cancel_at_period_end ? (
              <span className="text-base">
                Auto-renew off. Your access ends on{" "}
                {fmt(sub.ends_on ?? sub.current_period_end) ?? "—"}.
              </span>
            ) : null}
          </div>

          {/* Credits row */}
          <div className="text-sm min-h-[22px]">
            {loadingCredits ? (
              <div className="flex items-center gap-3">
                <Skeleton className="h-4 w-24 rounded" />
                <Skeleton className="h-4 w-24 rounded" />
                <Skeleton className="h-4 w-24 rounded" />
              </div>
            ) : (
              <div>
                Credits: SL {credits?.superlike_credits ?? 0} • Boost {credits?.boost_credits ?? 0}{" "}
                • Premium {credits?.premium_tokens ?? 0}
              </div>
            )}
          </div>

          {/* Subscriptions list */}
          <div className="space-y-2">
            <h2 className="font-semibold">Subscriptions</h2>
            <div className="grid sm:grid-cols-3 gap-3">
              {loadingPlans ? (
                <>
                  <PlanCardSkeleton />
                  <PlanCardSkeleton />
                  <PlanCardSkeleton />
                </>
              ) : subsOnly.length > 0 ? (
                subsOnly.map((p) => {
                  const current = isCurrentPlan(p);
                  const features = getSubscriptionFeatures(p);

                  return (
                    <button
                      key={p.price_id}
                      onClick={() => {
                        if (!current) buy(p.plan_slug, p.price_id);
                      }}
                      disabled={current}
                      aria-disabled={current}
                      title={current ? "This is your current plan" : undefined}
                      className={[
                        "border rounded p-3 text-sm transition text-left",
                        current
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                          : "hover:bg-default-50 cursor-pointer",
                      ].join(" ")}
                    >
                      <div className="flex items-center gap-2">
                        <div className="font-medium">{p.name || p.plan_slug}</div>
                        {current && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-200 text-gray-700">
                            Current
                          </span>
                        )}
                      </div>
                      <div className="text-default-600">
                        {(p.unit_amount / 100).toFixed(2)} {p.currency}
                        {p.interval ? ` / ${p.interval}` : ""}
                      </div>

                      {features.length > 0 && (
                        <ul className="mt-2 text-xs text-default-600 list-disc pl-5 space-y-1">
                          {features.map((f, i) => (
                            <li key={i}>{f}</li>
                          ))}
                        </ul>
                      )}
                    </button>
                  );
                })
              ) : (
                <div className="text-default-500 text-sm">No subscription plans</div>
              )}
            </div>
          </div>

          {/* One-time Packs list */}
          <div className="space-y-2">
            <h2 className="font-semibold">One-time Packs</h2>
            <div className="grid sm:grid-cols-3 gap-3">
              {loadingPlans ? (
                <>
                  <PlanCardSkeleton />
                  <PlanCardSkeleton />
                  <PlanCardSkeleton />
                </>
              ) : packsOnly.length > 0 ? (
                packsOnly.map((p) => {
                  const packFeatures = getPackFeatures(p);
                  return (
                    <button
                      key={p.price_id}
                      onClick={() => {
                        buy(p.plan_slug, p.price_id);
                      }}
                      className="border rounded p-3 text-sm hover:bg-default-50 text-left"
                    >
                      <div className="font-medium">{p.name || p.plan_slug}</div>
                      <div className="text-default-600">
                        {(p.unit_amount / 100).toFixed(2)} {p.currency}
                      </div>

                      {packFeatures.length > 0 && (
                        <ul className="mt-2 text-xs text-default-600 list-disc pl-5 space-y-1">
                          {packFeatures.map((f, i) => (
                            <li key={i}>{f}</li>
                          ))}
                        </ul>
                      )}
                    </button>
                  );
                })
              ) : (
                <div className="text-default-500 text-sm">No one-time packs</div>
              )}
            </div>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
