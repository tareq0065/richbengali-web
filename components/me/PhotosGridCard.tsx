"use client";

import { useRef, useState } from "react";
import { Card, CardBody, Button, Image, Skeleton } from "@heroui/react";
import { Upload, Eye, Trash2, Star } from "lucide-react";

type Photo = { id: string; url: string; is_primary?: boolean; sort_order: number };

export function PhotosGridCard({
  photos,
  uploadPhoto,
  deletePhoto,
  setPrimaryPhoto,
  reorderPhotos,
}: {
  photos: Photo[];
  uploadPhoto: (file: File) => any;
  deletePhoto: (id: string) => any;
  setPrimaryPhoto: (id: string) => any;
  reorderPhotos: (ids: string[]) => any;
}) {
  const galleryInputRef = useRef<HTMLInputElement | null>(null);
  const [slotLoading, setSlotLoading] = useState<boolean[]>([false, false, false, false, false]);

  const sorted = [...(photos ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const slots = Array.from({ length: 5 }, (_, i) => sorted[i] ?? null);
  const full = sorted.length >= 5;

  const onUploadGallery = async (files: FileList | null) => {
    if (!files) return;

    const current = [...(photos ?? [])].sort((a, b) => a.sort_order - b.sort_order);
    const curSlots = Array.from({ length: 5 }, (_, i) => current[i] ?? null);
    const emptyIdxs = curSlots.map((s, i) => (s ? -1 : i)).filter((i) => i !== -1) as number[];
    const room = emptyIdxs.length;
    const slice = Array.from(files).slice(0, room);
    if (slice.length === 0) return alert("You already have 5 photos");

    const nextLoading = [...slotLoading];
    for (let k = 0; k < slice.length; k++) {
      const file = slice[k];
      if (file.size > 2 * 1024 * 1024) {
        alert(`"${file.name}" exceeds 2MB and was skipped`);
        continue;
      }
      const slotIndex = emptyIdxs[k];
      if (slotIndex == null) break;
      nextLoading[slotIndex] = true;
      setSlotLoading([...nextLoading]);
      try {
        (await uploadPhoto(file).unwrap?.()) ?? uploadPhoto(file);
      } finally {
        nextLoading[slotIndex] = false;
        setSlotLoading([...nextLoading]);
      }
    }
  };

  const movePhoto = async (from: number, to: number) => {
    if (to < 0 || to >= sorted.length) return;
    const ids = sorted.map((p) => p.id);
    const [moved] = ids.splice(from, 1);
    ids.splice(to, 0, moved);
    await reorderPhotos(ids);
  };

  return (
    <Card>
      <CardBody className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Photos</h2>

          <input
            ref={galleryInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            className="hidden"
            onChange={(e) => onUploadGallery(e.target.files)}
          />
          <span>Upload (max 5, ≤2MB)</span>
        </div>

        {/* 2 columns on >=sm, 1 column on mobile */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {slots.map((p, idx) => {
            if (slotLoading[idx]) {
              return (
                <div key={`loading-${idx}`} className="rounded-lg border border-default-200">
                  <Skeleton className="w-full h-40 rounded-md" />
                </div>
              );
            }

            if (p) {
              return (
                <Card key={p.id} className="relative overflow-hidden group w-full">
                  <CardBody className="p-2">
                    {/* No fixed height here; let the image define height */}
                    <div className="h-auto md:max-h-20 relative w-full rounded-lg overflow-hidden">
                      <Image
                        src={p.url}
                        alt=""
                        className="w-full md:h-auto object-contain md:object-cover object-center block"
                      />
                      {/* Hover overlay adapts to image height */}
                      <div className="absolute rounded-lg inset-0 z-10 flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity bg-black/0 group-hover:bg-black/45">
                        <Button isIconOnly size="sm" onPress={() => window.open(p.url, "_blank")}>
                          <Eye size={16} />
                        </Button>
                        <Button
                          isIconOnly
                          size="sm"
                          color="danger"
                          onPress={() => deletePhoto(p.id)}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </div>

                    <div className="mt-2 flex items-center gap-2">
                      <Button
                        size="sm"
                        variant={p.is_primary ? "solid" : "flat"}
                        startContent={<Star size={14} />}
                        onPress={() => setPrimaryPhoto(p.id)}
                        className="w-full"
                      >
                        {p.is_primary ? "Primary" : "Make primary"}
                      </Button>
                    </div>

                    <div className="mt-2 flex justify-center gap-2">
                      <Button
                        size="sm"
                        variant="flat"
                        isDisabled={idx === 0}
                        onPress={() => movePhoto(idx, idx - 1)}
                        className="w-full sm:w-auto"
                        isIconOnly
                      >
                        ↑
                      </Button>
                      <Button
                        size="sm"
                        variant="flat"
                        isDisabled={idx === Math.min(sorted.length, 5) - 1}
                        onPress={() => movePhoto(idx, idx + 1)}
                        className="w-full sm:w-auto"
                        isIconOnly
                      >
                        ↓
                      </Button>
                    </div>
                  </CardBody>
                </Card>
              );
            }

            return (
              <div
                key={`empty-${idx}`}
                className="h-40 w-full rounded-lg border border-dashed border-default-300 flex items-center justify-center text-default-500 cursor-pointer"
                onClick={() => galleryInputRef.current?.click()}
              >
                + Upload
              </div>
            );
          })}
        </div>
      </CardBody>
    </Card>
  );
}
