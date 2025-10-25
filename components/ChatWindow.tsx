"use client";
import { useEffect, useRef, useState } from "react";
import type { Socket } from "socket.io-client";
import { getSocket } from "@/lib/socket";
import { getUserIdFromToken, getToken } from "@/lib/auth";
import { useGetUserQuery } from "@/store/api";
import { Button, Popover, PopoverContent, PopoverTrigger, Textarea } from "@heroui/react";
import { PhoneCall, SendIcon } from "lucide-react";
import { useMeeting } from "@/components/MeetingProvider"; // only to show other user's name

type ChatMessage = {
  id?: string;
  sender_id: string | number;
  receiver_id: string | number;
  content: string;
  created_at?: string | number;
  // client-only fields
  clientId?: string; // to reconcile optimistic -> server echo
  status?: "sending" | "sent"; // UI hint (optional)
};

function sid(v: string | number | undefined | null) {
  return v == null ? "" : String(v);
}

export default function ChatWindow({ otherUserId }: { otherUserId: string }) {
  const { startCall } = useMeeting();
  const meId = sid(getUserIdFromToken(getToken()));
  const otherId = sid(otherUserId);

  // (Optional) just to show their name above left bubbles
  const { data: otherUser } = useGetUserQuery(otherUserId, { skip: !otherUserId });
  const otherName = otherUser?.name || "User";

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // autoscroll on append
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length]);

  // join room + load history via socket ack
  useEffect(() => {
    const s: Socket | null = getSocket();
    if (!s || !otherId || !meId) return;

    s.emit("chat:join", { otherUserId: otherId });
    s.emit("chat:active", { withUserId: otherId });

    setLoading(true);
    // Ask server for history with an acknowledgement callback:
    // server should call: callback(rows)
    s.emit("chat:history", { withUserId: otherId }, (rows: ChatMessage[] = []) => {
      // Normalize IDs to strings for consistent comparisons
      const normalized = rows.map((m) => ({
        ...m,
        sender_id: sid(m.sender_id),
        receiver_id: sid(m.receiver_id),
        status: "sent" as const,
      }));
      setMessages(normalized);
      setLoading(false);
    });

    return () => {
      s.emit("chat:inactive", { withUserId: otherId });
      s.emit("chat:leave", { otherUserId: otherId });
    };
  }, [otherId, meId]);

  // live socket listener with optimistic reconciliation
  useEffect(() => {
    const s: Socket | null = getSocket();
    if (!s) return;

    const onIncoming = (msg: ChatMessage) => {
      const incoming: ChatMessage = {
        ...msg,
        sender_id: sid(msg.sender_id),
        receiver_id: sid(msg.receiver_id),
        status: "sent",
      };

      // Only keep messages for this thread
      const relevant =
        (incoming.sender_id === otherId && incoming.receiver_id === meId) ||
        (incoming.sender_id === meId && incoming.receiver_id === otherId);
      if (!relevant) return;

      setMessages((prev) => {
        // If this is our own echo and we added an optimistic with same clientId, replace it
        if (incoming.clientId) {
          const idx = prev.findIndex((m) => m.clientId && m.clientId === incoming.clientId);
          if (idx >= 0) {
            const copy = prev.slice();
            copy[idx] = { ...copy[idx], ...incoming, status: "sent" };
            return copy;
          }
        }
        // If server supplies a persisted id, de-dupe by id
        if (incoming.id && prev.some((m) => m.id === incoming.id)) return prev;

        return [...prev, incoming];
      });
    };

    s.on("chat:message", onIncoming);
    s.on("chat:message:ack", onIncoming); // if your server emits a separate ack channel

    return () => {
      s.off("chat:message", onIncoming);
      s.off("chat:message:ack", onIncoming);
    };
  }, [otherId, meId]);

  function sendMessage() {
    const s: Socket | null = getSocket();
    const content = text.trim();
    if (!s || !content || !otherId || !meId) return;

    const clientId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;

    // 1) optimistic append (right side, label "You")
    const optimistic: ChatMessage = {
      clientId,
      sender_id: meId,
      receiver_id: otherId,
      content,
      created_at: Date.now(),
      status: "sending",
    };
    setMessages((prev) => [...prev, optimistic]);

    // 2) emit to server with clientId so the echo can reconcile
    s.emit("chat:message", { to: otherId, content, clientId });

    setText("");
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-end shadow py-2 px-4">
        {otherUser && otherUser.is_premium ? (
          <Button
            color="secondary"
            variant="flat"
            isIconOnly
            onPress={() =>
              startCall({
                id: otherId,
                name: otherUser?.name,
                location: otherUser?.city || undefined,
                avatarUrl: otherUser?.profile_picture_url || undefined,
              })
            }
          >
            <PhoneCall size={16} />
          </Button>
        ) : (
          <Popover placement="right">
            <PopoverTrigger>
              <Button color="secondary" variant="flat" isIconOnly>
                <PhoneCall size={16} />
              </Button>
            </PopoverTrigger>
            <PopoverContent>
              <div className="px-1 py-2">
                <div className="text-small font-bold">Sorry!</div>
                <div className="text-tiny">
                  The user {otherUser && otherUser.name} is not a premium user. <br />
                  Please ask them to subscribe our premium packages to make calls.
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3 relative">
        <div className="p-2 text-center absolute bottom-0 left-0 right-0">
          {loading ? "Loading . . ." : ""}
        </div>

        {messages.map((m, idx) => {
          const isMine = sid(m.sender_id) === meId;
          const label = isMine ? "You" : otherName;

          return (
            <div
              key={m.id ?? m.clientId ?? `m-${idx}`}
              className={`flex ${isMine ? "justify-end" : "justify-start"}`}
            >
              <div className="max-w-[72%]">
                <div
                  className={`text-[11px] mb-1 ${
                    isMine ? "text-gray-600 text-right pr-1" : "text-gray-600 pl-1"
                  }`}
                >
                  {label}
                </div>
                <div
                  className={`px-3 py-2 rounded-2xl shadow-sm break-words ${
                    isMine
                      ? "bg-blue-600 text-white rounded-tr-md"
                      : "bg-gray-300 text-gray-900 rounded-tl-md"
                  }`}
                >
                  {m.content}
                </div>
                {isMine && m.status === "sending" && (
                  <div className="text-[10px] text-right text-gray-400 mt-0.5">sending…</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-2 flex gap-2">
        <Textarea
          value={text}
          variant="bordered"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
          maxRows={1}
          className="resize-none"
          placeholder="Type a message... (Enter to send, Shift+Enter for newline)"
        />
        <Button onPress={sendMessage} isIconOnly color="success">
          <SendIcon color="white" />
        </Button>
      </div>
    </div>
  );
}
