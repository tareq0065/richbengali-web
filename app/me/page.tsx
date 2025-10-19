"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  api,
  useGetMeQuery,
  useUpdateMeMutation,
  useUploadPhotoMutation,
  useDeletePhotoMutation,
  useSetPrimaryPhotoMutation,
  useReorderPhotosMutation,
} from "@/store/api";
import { clearToken, getToken } from "@/lib/auth";
import { useAppDispatch } from "@/store";
import { Button, Divider, Skeleton } from "@heroui/react";
import { LogOut, Save } from "lucide-react";

import { AvatarCard } from "@/components/me/AvatarCard";
import { QuickFieldsCard } from "@/components/me/QuickFieldsCard";
import { ExtendedDetailsCard } from "@/components/me/ExtendedDetailsCard";
import { PhotosGridCard } from "@/components/me/PhotosGridCard";
import Link from "next/link";

export default function MePage() {
  const dispatch = useAppDispatch();
  const router = useRouter();

  const { data: meWrap, isLoading } = useGetMeQuery();
  const me = meWrap?.data;

  const [updateMe, { isLoading: saving }] = useUpdateMeMutation();
  const [uploadPhoto] = useUploadPhotoMutation();
  const [deletePhoto] = useDeletePhotoMutation();
  const [setPrimaryPhoto] = useSetPrimaryPhotoMutation();
  const [reorderPhotos] = useReorderPhotosMutation();

  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [form, setForm] = useState<any>({});

  useMemo(() => {
    if (!me) return;
    setForm({
      name: me.name ?? "",
      age: me.age ?? 18,
      gender: me.gender ?? "other",
      city: me.city ?? "",
      profile_picture_url: me.profile_picture_url ?? null,
      height_cm: me.height_cm ?? "",
      weight_kg: me.weight_kg ?? "",
      looking_for: me.looking_for ?? "",
      work: me.work ?? "",
      education: me.education ?? "",
      education_level: me.education_level ?? "",
      drinking: me.drinking ?? "",
      smoking: me.smoking ?? "",
      religion: me.religion ?? "",
      languages: me.languages ?? [],
      interests: me.interests ?? [],
    });
  }, [me]);

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", cache: "no-store" });
    } catch {}
    clearToken();
    dispatch(api.util.resetApiState());
    router.replace("/");
  };

  const onSave = async () => {
    await updateMe({
      ...form,
      age: form.age ? Number(form.age) : undefined,
      height_cm: form.height_cm ? Number(form.height_cm) : null,
      weight_kg: form.weight_kg ? Number(form.weight_kg) : null,
    });
  };

  const onUploadAvatar = async (file?: File) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) return alert("Max 2MB");
    try {
      setUploadingAvatar(true);
      const fd = new FormData();
      fd.append("file", file);
      const token = getToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE}/uploads/profile`, {
        method: "POST",
        body: fd,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        cache: "no-store",
      });
      if (!res.ok) throw new Error((await res.text().catch(() => "")) || "Upload failed");
      const json = await res.json();
      const url = json?.url || json?.data?.url;
      if (url) setForm((s: any) => ({ ...s, profile_picture_url: url }));
    } catch (e: any) {
      alert(e?.message || "Upload failed");
    } finally {
      setUploadingAvatar(false);
    }
  };

  if (isLoading || !me) {
    return (
      <div className="max-w-5xl mx-auto p-4 space-y-4">
        <div className="flex justify-end">
          <Skeleton className="h-9 w-24" />
        </div>
        <Divider className="my-4" />
        <Skeleton className="h-8 w-64" />
        <div className="grid md:grid-cols-2 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      </div>
    );
  }

  const photos = [...(me?.photos ?? [])].sort((a, b) => a.sort_order - b.sort_order);

  return (
    <div className="py-4 space-y-6">
      {/* top bar */}
      <div className="flex justify-between items-center">
        <div className="text-base sm:text-lg font-semibold">My Profile</div>
        <Button
          size="sm"
          color="danger"
          variant="flat"
          startContent={<LogOut size={14} />}
          onPress={logout}
        >
          Logout
        </Button>
      </div>
      <Divider className="my-2" />

      {/* avatar + quick fields */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        <div className="lg:col-span-1">
          <AvatarCard
            uploadingAvatar={uploadingAvatar}
            avatarUrl={form.profile_picture_url}
            onPickAvatar={() => avatarInputRef.current?.click()}
          />
          <input
            ref={avatarInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => onUploadAvatar(e.target.files?.[0] ?? undefined)}
            disabled={uploadingAvatar}
          />
        </div>

        <div className="lg:col-span-2">
          <QuickFieldsCard form={form} setForm={setForm} />
        </div>
      </div>

      {/* photos + extended details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        <div className="lg:col-span-1 order-2 lg:order-1">
          <PhotosGridCard
            photos={photos}
            uploadPhoto={uploadPhoto}
            deletePhoto={deletePhoto}
            setPrimaryPhoto={setPrimaryPhoto}
            reorderPhotos={reorderPhotos}
          />
        </div>

        <div className="lg:col-span-2 order-1 lg:order-2">
          <ExtendedDetailsCard form={form} setForm={setForm} />
        </div>
      </div>

      {/* actions: full-width on mobile, inline on desktop */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          className="w-full sm:w-auto"
          color="primary"
          startContent={<Save size={14} />}
          isLoading={saving}
          onPress={onSave}
        >
          Save changes
        </Button>
      </div>
      <div className="mt-8 text-right text-blue-400">
        <Link href="/about">About</Link>
      </div>
    </div>
  );
}
