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
import { getToken } from "@/lib/auth";
import { Button, Card, CardBody, Skeleton } from "@heroui/react";
import { CardHeader } from "@heroui/card";

/** Small date formatter (local time). */
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

/** Render a single, clear line describing renewal/expiry state from the normalized sub view. */
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

  // Past due / unpaid
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

  // Fallback
  return <span>Status: {sub.status}</span>;
}

/** Reusable skeleton “card” for plan tiles (keeps grid size stable) */
function PlanCardSkeleton() {
  return (
    <div className="border rounded p-3">
      <Skeleton className="h-5 w-1/2 rounded mb-2" />
      <Skeleton className="h-4 w-2/3 rounded" />
    </div>
  );
}

export default function SubscriptionPage() {
  const router = useRouter();
  const params = useSearchParams();

  // Read Stripe params once, then strip them from the URL
  const initialStatus = useRef<"success" | "cancel" | null>(
    (params.get("status") as "success" | "cancel" | null) ?? null,
  );
  const initialSessionId = useRef<string | null>(params.get("session_id"));
  const initialPriceId = useRef<string | null>(params.get("price_id"));
  const initialPlanSlug = useRef<string | null>(params.get("plan"));

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

  // Confirm session once (fallback for local dev / slow webhook), then clean the URL.
  useEffect(() => {
    (async () => {
      if (initialStatus.current === "success" && initialSessionId.current) {
        try {
          await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/stripe/confirm`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${getToken()}`,
            },
            body: JSON.stringify({ session_id: initialSessionId.current }),
          });
        } catch {
          // swallow; webhook will still complete
        }
        await Promise.all([refetchSub(), refetchCredits()]);
      }

      // Strip query params so the page URL stays clean.
      if (params.toString()) router.replace("/subscription");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Light polling after success to catch the webhook/confirm write (max ~6s).
  useEffect(() => {
    if (initialStatus.current !== "success") return;
    let cancelled = false;
    let tries = 0;

    const poll = async () => {
      tries += 1;
      await Promise.all([refetchSub(), refetchCredits()]);
      const ok = !!sub?.status && sub.status !== "none" && sub.status !== "incomplete";
      if (!cancelled && !ok && tries < 6) {
        setTimeout(poll, 1000);
      }
    };

    const t0 = setTimeout(poll, 800);
    return () => {
      cancelled = true;
      clearTimeout(t0);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refetchSub, refetchCredits]);

  // Resolve the active plan for display from backend fields or the initial redirect params.
  const activePlan = useMemo(() => {
    const list = Array.isArray(plans) ? (plans as any[]) : [];
    const byPrice = sub?.plan_price_id ? list.find((p) => p.price_id === sub.plan_price_id) : null;
    const bySlug =
      !byPrice && sub?.plan_slug ? list.find((p) => p.plan_slug === sub.plan_slug) : null;
    const byParam =
      !byPrice && !bySlug && initialPriceId.current
        ? list.find((p) => p.price_id === initialPriceId.current)
        : null;
    const byParamSlug =
      !byPrice && !bySlug && !byParam && initialPlanSlug.current
        ? list.find((p) => p.plan_slug === initialPlanSlug.current)
        : null;

    return byPrice || bySlug || byParam || byParamSlug || null;
  }, [plans, sub?.plan_price_id, sub?.plan_slug]);

  async function buy(plan_slug: string, price_id: string) {
    const { data } = await checkout({ plan: plan_slug, price_id } as any);
    if (data?.url) window.location.href = data.url;
  }

  const list = Array.isArray(plans) ? (plans as any[]) : [];
  const subsOnly = list.filter((p) => p.plan_type === "subscription");
  const packsOnly = list.filter((p) => p.plan_type === "one_time");

  const showFinalizing =
    initialStatus.current === "success" &&
    (!sub?.status || sub.status === "none" || sub.status === "incomplete");

  // Helper: is this plan the user's current subscription?
  const isCurrentPlan = (p: any) =>
    !!sub &&
    !!sub.plan_price_id &&
    sub.plan_price_id === p.price_id &&
    sub.status !== "canceled" &&
    sub.status !== "incomplete_expired";

  async function onCancel() {
    const ok = window.confirm(
      "Cancel auto-renew? You'll keep access until the end of the current period.",
    );
    if (!ok) return;
    try {
      await cancelSub({}).unwrap(); // no body => disable auto-renew
      await refetchSub();
    } catch (e) {
      console.error(e);
    }
  }

  async function onResume() {
    const ok = window.confirm("Enable auto-renew again?");
    if (!ok) return;
    try {
      await cancelSub({ enable: true }).unwrap(); // enable auto-renew
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

          {/* Finalizing / Canceled banners (fixed height to avoid shift) */}
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

          {/* Status line (no layout shift) */}
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

          {/* Current package (stable block) */}
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

          {/* Credits (fixed height row) */}
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

          {/* Subscriptions grid */}
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

                  const features: string[] = [];
                  if (p.unlimited_swipes) features.push("Unlimited swipes");
                  if (p.see_who_liked) features.push("See who liked you");
                  if (typeof p.superlikes_per_period === "number" && p.superlikes_per_period > 0) {
                    const period = p.superlike_period || p.interval || "month";
                    features.push(`${p.superlikes_per_period} super likes per ${period}`);
                  }
                  if (typeof p.boosts_per_week === "number" && p.boosts_per_week > 0) {
                    features.push(`${p.boosts_per_week} profile boosts per week`);
                  }
                  if (p.priority_support) features.push("Priority customer support");
                  if (p.badge) features.push("Exclusive badge on profile");

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
                        {(p.unit_amount / 100).toFixed(2)} {p.currency} / {p.interval}
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

          {/* One-time Packs grid */}
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
                packsOnly.map((p) => (
                  <button
                    key={p.price_id}
                    onClick={() => {
                      return;
                      // buy(p.plan_slug, p.price_id);
                    }}
                    className="border rounded p-3 text-sm hover:bg-default-50 text-left"
                  >
                    <div className="font-medium">{p.name || p.plan_slug}</div>
                    <div className="text-default-600">
                      {(p.unit_amount / 100).toFixed(2)} {p.currency}
                    </div>
                    {p.description && (
                      <div className="text-xs text-default-600 mt-1">{p.description}</div>
                    )}
                    {p.credit_type && p.credit_quantity > 0 && (
                      <div className="text-xs mt-1">
                        Includes {p.credit_quantity} {p.credit_type} credit
                        {p.credit_quantity > 1 ? "s" : ""}
                      </div>
                    )}
                  </button>
                ))
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
