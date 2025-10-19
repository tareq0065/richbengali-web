// app/chats/page.tsx
"use client";
import { useState, useEffect } from "react";
import { useConversationsQuery, useSubscriptionQuery, useGetUserQuery } from "@/store/api";
import ChatWindow from "@/components/ChatWindow";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Card, CardBody, Skeleton } from "@heroui/react";

export default function ChatsPage() {
  const { data: sub, isLoading: subLoading } = useSubscriptionQuery();
  const hasSub = sub?.status === "active" || sub?.status === "trialing";

  const {
    data: convos,
    isLoading: convosLoading,
    isFetching: convosFetching,
  } = useConversationsQuery(undefined, { skip: !hasSub });

  const [list, setList] = useState<any[]>(convos || []);
  const loadingConvos = hasSub && (convosLoading || convosFetching);

  const params = useSearchParams();
  const initial = params.get("u") || "";

  const [active, setActive] = useState<string>(initial);
  const { data: initialUser } = useGetUserQuery(initial, { skip: !initial || !hasSub });

  // keep local list synced with server convos
  useEffect(() => {
    setList(convos || []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(convos)]);

  // deep-link: if ?u= provided and not already in convos, append and activate
  useEffect(() => {
    if (!hasSub) return; // no sub → do nothing
    if (!initial) return;
    const exists = (convos || []).some((u: any) => u.id === initial);
    if (!exists && initialUser) {
      setList((prev) => (prev.some((u: any) => u.id === initial) ? prev : [initialUser, ...prev]));
    }
    if (initial && !active) setActive(initial);
  }, [initial, initialUser, convos, active, hasSub]);

  // default to first convo if none active & no deep-link
  useEffect(() => {
    if (!hasSub) return;
    if (initial) return;
    if (convos && convos.length && !active) setActive(convos[0].id);
  }, [convos, active, initial, hasSub]);

  // if subscription not present, ensure no chat can be shown
  useEffect(() => {
    if (!hasSub && active) setActive("");
  }, [hasSub, active]);

  if (subLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg p-2">
          <Skeleton className="h-[520px] w-full rounded mb-3" />
        </div>
        <div className="md:col-span-2">
          <Skeleton className="h-[530px] w-full rounded mb-3" />
        </div>
      </div>
    );
  }

  const PremiumMessage = () => (
    <div className="h-[60vh] flex items-center">
      <div className="p-6 border rounded-lg">
        <div className="text-lg font-semibold mb-2">Chat is a Premium feature</div>
        <p className="text-sm text-default-600 mb-4">
          Subscribe to start conversations. Boosts or Superlikes don’t unlock chat.
        </p>
        <Link href="/subscription" className="px-3 py-2 bg-blue-600 text-white rounded text-sm">
          Go to Subscription
        </Link>
      </div>
    </div>
  );

  return (
    <Card>
      <CardBody>
        <div className="grid grid-cols-1 md:grid-cols-3">
          <div className="sm:border-r-1 p-2">
            <div className="font-semibold mb-2">
              Conversations{loadingConvos ? " Loading.." : ""}
            </div>
            <div className="space-y-1 overflow-y-auto">
              {(list || []).map((u: any) => (
                <button
                  key={u.id}
                  onClick={() => setActive(u.id)}
                  className={`w-full text-left px-2 py-3 rounded text-sm ${
                    active === u.id ? "bg-blue-50" : "hover:bg-gray-50"
                  }`}
                >
                  {u.name} • {u.city}
                </button>
              ))}
              {(!list || list.length === 0) && !loadingConvos && (
                <div className="text-default-500 text-sm py-3">
                  No conversations yet. Open a profile and send a message to start.
                </div>
              )}
            </div>
          </div>

          {/* Right pane */}
          <div className="md:col-span-2">
            {!hasSub ? (
              <div className="h-[60vh] grid place-items-center text-default-500">
                <PremiumMessage />
              </div>
            ) : active ? (
              <div className="h-[60vh]">
                <ChatWindow otherUserId={active} />
              </div>
            ) : (
              <div className="h-[60vh] grid place-items-center text-default-500">
                <div className="h-[60vh]">
                  <div>Select a conversation</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
