"use client";

import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  useGetUserQuery,
  useLikeMutation,
  useFavoriteMutation,
  useSuperlikeMutation,
  useVisitMutation,
  useSubscriptionQuery,
  useUnlikeMutation,
  useUnfavoriteMutation,
  useCreditsQuery,
  useGetRefQuery,
  useRelationStatusQuery,
} from "@/store/api";
import { Button, Card, CardBody, Chip, Skeleton, Badge, Spinner } from "@heroui/react";
import Link from "next/link";

function nice(slug?: string | null, map?: Map<string, string>) {
  if (!slug) return "-";
  if (map?.has(slug)) return map.get(slug)!;
  return slug.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ProfilePage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();

  const { data: user, isLoading, isFetching } = useGetUserQuery(params.id);
  const { data: status } = useRelationStatusQuery(params.id);
  const { data: sub } = useSubscriptionQuery();
  const [like] = useLikeMutation();
  const [unlike] = useUnlikeMutation();
  const [favorite] = useFavoriteMutation();
  const [unfavorite] = useUnfavoriteMutation();
  const [superlike, { isLoading: isSuperLiking }] = useSuperlikeMutation();
  const [visit] = useVisitMutation();
  const { data: credits } = useCreditsQuery();

  // refs for labels
  const { data: lfResp } = useGetRefQuery("looking_for");
  const { data: elResp } = useGetRefQuery("education_level");
  const { data: relResp } = useGetRefQuery("religion");
  const { data: langResp } = useGetRefQuery("language");
  const { data: intResp } = useGetRefQuery("interest");

  const lfMap = useMemo(
    () => new Map((lfResp?.data ?? []).map((o: any) => [o.slug, o.label])),
    [lfResp],
  );
  const elMap = useMemo(
    () => new Map((elResp?.data ?? []).map((o: any) => [o.slug, o.label])),
    [elResp],
  );
  const relMap = useMemo(
    () => new Map((relResp?.data ?? []).map((o: any) => [o.slug, o.label])),
    [relResp],
  );
  const langMap = useMemo(
    () => new Map((langResp?.data ?? []).map((o: any) => [o.slug, o.label])),
    [langResp],
  );
  const intMap = useMemo(
    () => new Map((intResp?.data ?? []).map((o: any) => [o.slug, o.label])),
    [intResp],
  );

  // Respect primary, then sort_order for all photos
  const photos = useMemo(() => {
    const arr = user?.photos ?? [];

    return [...arr].sort((a, b) => {
      if (a.is_primary && !b.is_primary) return -1;
      if (b.is_primary && !a.is_primary) return 1;
      return (a.sort_order ?? 0) - (b.sort_order ?? 0);
    });
  }, [user?.photos]);

  const defaultPhoto = photos[0] ?? null;
  const [currentPhotoId, setCurrentPhotoId] = useState<string | null>(defaultPhoto?.id ?? null);

  // Loading states for images
  const [mainImgLoading, setMainImgLoading] = useState<boolean>(true);
  const [thumbLoading, setThumbLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // reset selection when user/params change
    setCurrentPhotoId(defaultPhoto?.id ?? null);
    setMainImgLoading(true);
    setThumbLoading({});
  }, [params.id, defaultPhoto?.id]);

  const currentPhotoUrl = useMemo(() => {
    const cur = photos.find((p) => p.id === currentPhotoId);
    return cur?.url ?? defaultPhoto?.url ?? null;
  }, [photos, currentPhotoId, defaultPhoto]);

  useEffect(() => {
    const t = setTimeout(() => {
      visit({ targetId: params.id }).catch(() => {});
    }, 5000);
    return () => clearTimeout(t);
  }, [params.id, visit]);

  const canMessage = useMemo(
    () => sub?.status === "active" || sub?.status === "trialing",
    [sub?.status],
  );

  async function toggle(kind: "like" | "favorite" | "superlike") {
    if (!params?.id) return;
    try {
      if (kind === "like") {
        if (status?.is_liked) await unlike({ targetId: params.id }).unwrap();
        else await like({ targetId: params.id }).unwrap();
      } else if (kind === "favorite") {
        if (status?.is_favorited) await unfavorite({ targetId: params.id }).unwrap();
        else await favorite({ targetId: params.id }).unwrap();
      } else {
        await superlike({ targetId: params.id }).unwrap();
      }
    } catch (e: any) {
      if (e?.data?.message?.includes("Not enough")) {
        alert("You’re out of Super Likes! Buy more credits to continue.");
        router.push("/subscription");
      } else {
        console.error(e);
      }
    }
  }

  function openChat() {
    if (!canMessage) router.push("/subscription");
  }

  const languages: string[] = user?.languages ?? [];
  const interests: string[] = user?.interests ?? [];

  // UI
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {isLoading || isFetching ? (
          <Skeleton className="h-7 w-56 rounded-md" />
        ) : (
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold">
              {user?.name}{" "}
              {user?.age ? <span className="text-default-500">• {user.age}</span> : null}
            </h1>
            {(user as any)?.is_boosted ? (
              <Badge color="secondary" className="uppercase tracking-wide">
                Boosted
              </Badge>
            ) : null}
          </div>
        )}

        <div className="flex gap-2">
          <Button
            size="sm"
            variant="flat"
            onPress={() => toggle("favorite")}
            color={status?.is_favorited ? "danger" : "default"}
          >
            {status?.is_favorited ? "Unfavorite" : "Favorite"}
          </Button>

          <Button
            size="sm"
            variant="flat"
            onPress={() => toggle("like")}
            color={status?.is_liked ? "danger" : "default"}
          >
            {status?.is_liked ? "Unlike" : "Like"}
          </Button>

          <Button
            size="sm"
            variant="flat"
            color="secondary"
            isLoading={isSuperLiking}
            onPress={() => toggle("superlike")}
            isDisabled={!!status?.is_superliked || (credits?.superlike_credits ?? 0) <= 0}
          >
            {status?.is_superliked ? "Super Liked" : "Super Like"}
          </Button>
          <Button
            as={Link}
            isLoading={!(user as any)?.id}
            href={`/chats?u=${(user as any)?.id}`}
            size="sm"
            color="primary"
            onPress={openChat}
          >
            Message
          </Button>
        </div>
      </div>

      {/* Body */}
      {isLoading || isFetching ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardBody className="p-3">
              <div
                className="w-full rounded-2xl overflow-hidden bg-default-100"
                style={{ height: 480 }}
              >
                <Skeleton className="w-full h-full rounded-2xl" />
              </div>
              <div className="mt-3 flex gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-16 rounded-xl" />
                ))}
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardBody className="p-5 space-y-4">
              <Skeleton className="h-5 w-40 rounded-md" />
              <Skeleton className="h-4 w-56 rounded-md" />
              <Skeleton className="h-4 w-48 rounded-md" />
              <Skeleton className="h-4 w-64 rounded-md" />
              <Skeleton className="h-4 w-44 rounded-md" />
              <div className="flex gap-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-7 w-20 rounded-md" />
                ))}
              </div>
            </CardBody>
          </Card>
        </div>
      ) : user ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left: Photos */}
          <Card shadow="sm">
            <CardBody className="p-3">
              {/* Main image container with fixed height; image uses object-contain to always fully fit */}
              <div
                className="w-full rounded-2xl overflow-hidden bg-black/5 relative"
                style={{ height: 480 }}
              >
                {currentPhotoUrl ? (
                  <>
                    {mainImgLoading && (
                      <div className="absolute inset-0 grid place-items-center">
                        <Spinner label="Loading image..." />
                      </div>
                    )}
                    <Image
                      src={currentPhotoUrl}
                      alt={user.name}
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      className="object-contain"
                      onLoadStart={() => setMainImgLoading(true)}
                      onLoadingComplete={() => setMainImgLoading(false)}
                      priority
                    />
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-default-400">
                    No Photo
                  </div>
                )}
              </div>

              {/* Thumbnails (sorted by primary then sort_order) */}
              {photos.length > 0 && (
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                  {photos.map((p) => {
                    const selected = p.id === currentPhotoId;
                    const loading = thumbLoading[p.id];
                    return (
                      <button
                        key={p.id}
                        className={`relative h-16 w-16 min-w-16 overflow-hidden rounded-xl ring-1 ring-default-200 hover:ring-primary transition
                                    ${selected ? "ring-2 ring-primary" : ""}`}
                        onClick={() => {
                          setCurrentPhotoId(p.id);
                          setMainImgLoading(true);
                        }}
                        aria-label="photo thumbnail"
                      >
                        {loading && (
                          <div className="absolute inset-0 grid place-items-center bg-black/10">
                            <Spinner size="sm" />
                          </div>
                        )}
                        <Image
                          src={p.url}
                          alt="thumb"
                          width={200}
                          height={200}
                          className="h-full w-full object-cover"
                          onLoadStart={() => setThumbLoading((s) => ({ ...s, [p.id]: true }))}
                          onLoadingComplete={() =>
                            setThumbLoading((s) => ({ ...s, [p.id]: false }))
                          }
                        />
                        {p.is_primary ? (
                          <span className="absolute bottom-1 right-1 text-[10px] px-1.5 py-0.5 rounded-full bg-black/60 text-white">
                            Primary
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              )}
            </CardBody>
          </Card>

          {/* Right: Details */}
          <Card shadow="sm">
            <CardBody className="p-5 text-sm space-y-3">
              {/* Contact (masked) */}
              <div className="mt-2 grid grid-cols-2 gap-3">
                <div className="text-default-500">Email</div>
                <div className="font-medium">{user.email ?? "-"}</div>

                <div className="text-default-500">Phone</div>
                <div className="font-medium">{user.phone ?? "-"}</div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="text-default-500">City</div>
                <div className="font-medium">{user.city ?? "-"}</div>

                <div className="text-default-500">Height</div>
                <div className="font-medium">{user.height_cm ? `${user.height_cm} cm` : "-"}</div>

                <div className="text-default-500">Weight</div>
                <div className="font-medium">{user.weight_kg ? `${user.weight_kg} kg` : "-"}</div>

                <div className="text-default-500">Looking for</div>
                <div className="font-medium">{nice(user.looking_for, lfMap)}</div>

                <div className="text-default-500">Education</div>
                <div className="font-medium">{user.education ? `${user.education}` : "-"}</div>

                <div className="text-default-500">Education level</div>
                <div className="font-medium">{nice(user.education_level, elMap)}</div>

                <div className="text-default-500">Work</div>
                <div className="font-medium">{user.work ?? "-"}</div>

                <div className="text-default-500">Drinking</div>
                <div className="font-medium">
                  {user.drinking
                    ? user.drinking === "no"
                      ? "No"
                      : user.drinking.charAt(0).toUpperCase() + user.drinking.slice(1)
                    : "-"}
                </div>

                <div className="text-default-500">Smoking</div>
                <div className="font-medium">
                  {user.smoking
                    ? user.smoking === "no"
                      ? "No"
                      : user.smoking.charAt(0).toUpperCase() + user.smoking.slice(1)
                    : "-"}
                </div>

                <div className="text-default-500">Religion</div>
                <div className="font-medium">{nice(user.religion, relMap)}</div>
              </div>

              {/* Languages */}
              <div className="mt-2">
                <div className="text-default-500 mb-2">Languages</div>
                <div className="flex flex-wrap gap-2">
                  {languages.length ? (
                    languages.map((slug) => (
                      <Chip key={slug} size="sm" variant="flat">
                        {nice(slug, langMap)}
                      </Chip>
                    ))
                  ) : (
                    <span className="text-default-400">-</span>
                  )}
                </div>
              </div>

              {/* Interests */}
              <div className="mt-2">
                <div className="text-default-500 mb-2">Interests</div>
                <div className="flex flex-wrap gap-2">
                  {interests.length ? (
                    interests.map((slug) => (
                      <Chip key={slug} size="sm" color="primary" variant="flat">
                        {nice(slug, intMap)}
                      </Chip>
                    ))
                  ) : (
                    <span className="text-default-400">-</span>
                  )}
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
