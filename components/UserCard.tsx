"use client";
import Image from "next/image";
import Link from "next/link";
import type { User } from "@/lib/types";
import { Card, CardBody, Button, Chip, Tooltip, addToast } from "@heroui/react";
import { Heart, ThumbsUp } from "lucide-react";
import {
  useFavoriteMutation,
  useLikeMutation,
  useRelationStatusQuery,
  useSuperlikeMutation,
  useUnfavoriteMutation,
  useUnlikeMutation,
} from "@/store/api";

type Props = { user: User };

export default function UserCard({ user }: Props) {
  const [like] = useLikeMutation();
  const [unlike] = useUnlikeMutation();
  const [favorite] = useFavoriteMutation();
  const [unfavorite] = useUnfavoriteMutation();
  const [superlike] = useSuperlikeMutation();
  const { data: status } = useRelationStatusQuery(user.id);

  async function toggle(kind: "like" | "favorite") {
    if (!user?.id) return;
    try {
      if (kind === "like") {
        if (status?.is_liked) await unlike({ targetId: user.id }).unwrap();
        else await like({ targetId: user.id }).unwrap();
      } else {
        if (status?.is_favorited) await unfavorite({ targetId: user.id }).unwrap();
        else await favorite({ targetId: user.id }).unwrap();
      }
    } catch (e: any) {
      if (e?.data?.message?.includes("Not enough")) {
        addToast({ icon: "error", title: "Error", description: e.data.message });
      } else {
        console.error(e);
      }
    }
  }

  const primary = user.photos?.find((p) => p.is_primary);
  const imgSrc: string | undefined = primary?.url ?? user.profile_picture_url ?? undefined;

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow" isFooterBlurred>
      <div className="relative aspect-square w-full bg-gray-100">
        {imgSrc ? (
          <Image
            src={imgSrc}
            alt={user.name || "Profile photo"}
            fill
            sizes="(max-width: 768px) 50vw, 33vw"
            className="object-cover"
            priority={false}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400">
            No Photo
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 p-3 pt-8 bg-gradient-to-t from-black/70 via-black/20 to-transparent">
          <div className="flex items-end justify-between">
            <div className="text-white">
              <div className="font-semibold leading-tight">
                {user.name} <span className="text-white/80">{user.age}</span>
              </div>
              {user.city && <div className="text-xs text-white/70">{user.city}</div>}
            </div>
            {user.is_boosted && (
              <Chip
                size="sm"
                color="secondary"
                variant="shadow"
                className="bg-purple-600 text-white"
              >
                BOOSTED
              </Chip>
            )}
          </div>
        </div>

        <div className="absolute right-0 top-3 px-3">
          <div className="flex gap-2 justify-center">
            <Tooltip content="Like">
              <Button
                isIconOnly
                radius="full"
                size="sm"
                color={status?.is_liked ? "primary" : "success"}
                onPress={() => toggle("like")}
                className="backdrop-blur"
              >
                <ThumbsUp size={18} />
              </Button>
            </Tooltip>
            <Tooltip content="Favorite">
              <Button
                isIconOnly
                radius="full"
                size="sm"
                color={status?.is_favorited ? "default" : "danger"}
                onPress={() => toggle("favorite")}
                className="backdrop-blur"
              >
                <Heart size={18} />
              </Button>
            </Tooltip>
          </div>
        </div>
      </div>

      <CardBody className="p-3">
        <Link href={`/profile/${user.id}`}>
          <Button size="sm" className="w-full" variant="flat">
            View Profile
          </Button>
        </Link>
      </CardBody>
    </Card>
  );
}
