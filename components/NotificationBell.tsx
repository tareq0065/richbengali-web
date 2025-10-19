"use client";

import { useMemo, useState } from "react";
import {
  Badge,
  Button,
  Popover,
  PopoverTrigger,
  PopoverContent,
  ScrollShadow,
  Skeleton,
  Listbox,
  ListboxItem,
  Avatar,
} from "@heroui/react";
import {
  useMarkAllNotificationsReadMutation,
  useMarkNotificationReadMutation,
  useNotificationsQuery,
} from "@/store/api";
import { getUserIdFromToken, getToken } from "@/lib/auth";
import { useAppSelector } from "@/store";
import { useRouter } from "next/navigation";

export const NotificationIcon = ({ size, height, width, ...props }: any) => (
  <svg
    fill="none"
    height={size || height || 24}
    viewBox="0 0 24 24"
    width={size || width || 24}
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path
      clipRule="evenodd"
      d="M18.707 8.796c0 1.256.332 1.997 1.063 2.85.553.628.73 1.435.73 2.31 0 .874-.287 1.704-.863 2.378a4.537 4.537 0 01-2.9 1.413c-1.571.134-3.143.247-4.736.247-1.595 0-3.166-.068-4.737-.247a4.532 4.532 0 01-2.9-1.413 3.616 3.616 0 01-.864-2.378c0-.875.178-1.682.73-2.31.754-.854 1.064-1.594 1.064-2.85V8.37c0-1.682.42-2.781 1.283-3.858C7.861 2.942 9.919 2 11.956 2h.09c2.08 0 4.204.987 5.466 2.625.82 1.054 1.195 2.108 1.195 3.745v.426zM9.074 20.061c0-.504.462-.734.89-.833.5-.106 3.545-.106 4.045 0 .428.099.89.33.89.833-.025.48-.306.904-.695 1.174a3.635 3.635 0 01-1.713.731 3.795 3.795 0 01-1.008 0 3.618 3.618 0 01-1.714-.732c-.39-.269-.67-.694-.695-1.173z"
      fill="currentColor"
      fillRule="evenodd"
    />
  </svg>
);

export default function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const stateUserId = useAppSelector((s) => s.auth.user?.id) ?? null;
  const token = getToken();
  const fallbackUserId = token ? getUserIdFromToken(token) : null;
  const authUserId = stateUserId ?? fallbackUserId;
  const shouldSkip = !token;

  const { data, isFetching, isLoading, refetch } = useNotificationsQuery(authUserId, {
    skip: shouldSkip,
    refetchOnMountOrArgChange: true,
    refetchOnFocus: true,
    refetchOnReconnect: true,
    pollingInterval: 20000,
  });

  const [markRead] = useMarkNotificationReadMutation();
  const [markAllRead, { isLoading: isAllLoading }] = useMarkAllNotificationsReadMutation();

  const count = data?.filter((n) => !n.is_read)?.length ?? 0;
  const badgeContent = useMemo(
    () => (count ? (count > 99 ? "99+" : String(count)) : undefined),
    [count],
  );

  function routeFor(n: any) {
    const actorId = n?.actor?.id ?? n?.actor_id;
    // message → /chats?u=actorId
    if (n?.type === "message") return actorId ? `/chats?u=${actorId}` : "/chats";
    // like / favorite / superlike → /profile/actorId
    if (["like", "favorite", "superlike", "visit"].includes(n?.type)) {
      return actorId ? `/profile/${actorId}` : "/profile";
    }
    // fallback (you can customize more types)
    return "/";
  }

  async function handleClick(n: any) {
    try {
      if (!n.is_read) await markRead(n.id).unwrap();
    } finally {
      const to = routeFor(n);
      router.push(to);
      setOpen(false);
    }
  }

  return (
    <Popover
      isOpen={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (v) void refetch();
      }}
      placement="bottom-end"
      offset={16}
      showArrow
    >
      <Badge
        color="danger"
        content={badgeContent || 0}
        shape="rectangle"
        size="sm"
        className="pointer-events-none absolute -top-1 -right-1"
      >
        <PopoverTrigger asChild>
          <Button isIconOnly radius="full" variant="light" size="sm" aria-label="Notifications">
            <NotificationIcon size={22} />
          </Button>
        </PopoverTrigger>
      </Badge>

      <PopoverContent className="w-[340px] p-0 z-[9999]">
        <div className="p-3 w-full">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold mb-2">Notifications</div>
            <Button
              size="sm"
              variant="light"
              isDisabled={!data?.some((n) => !n.is_read) || isAllLoading}
              onPress={() => markAllRead()}
            >
              Mark all as read
            </Button>
          </div>

          {(isLoading || isFetching) && (
            <div className="space-y-2">
              <Skeleton className="h-12 rounded-lg" />
              <Skeleton className="h-12 rounded-lg" />
              <Skeleton className="h-12 rounded-lg" />
            </div>
          )}

          {!isLoading && !isFetching && (
            <>
              {!data || data.length === 0 ? (
                <div className="text-default-500 text-sm py-6 text-center">
                  No notifications yet.
                </div>
              ) : (
                <ScrollShadow className="max-h-80 pr-1">
                  <Listbox aria-label="Notifications list" itemClasses={{ base: "px-3 py-2" }}>
                    {data.map((n: any) => {
                      const title =
                        (n.type ?? "").toUpperCase() + (n?.actor?.name ? ` • ${n.actor.name}` : "");
                      const desc = n?.message ?? new Date(n.created_at).toLocaleString();
                      const src = n?.actor?.profile_picture_url ?? undefined;

                      return (
                        <ListboxItem
                          key={n.id}
                          onPress={() => handleClick(n)}
                          className={`text-sm cursor-pointer ${!n.is_read ? "bg-default-100" : ""}`}
                        >
                          <div className="flex gap-2 items-center">
                            <Avatar
                              size="sm"
                              radius="full"
                              color="primary"
                              src={src}
                              name={n?.actor?.name || " "}
                            />
                            <div className="flex flex-col">
                              <span className="text-small">{title}</span>
                              <span className="text-tiny text-default-400">
                                {new Date(n.created_at).toLocaleTimeString()}
                              </span>
                            </div>
                          </div>
                        </ListboxItem>
                      );
                    })}
                  </Listbox>
                </ScrollShadow>
              )}
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
