"use client";

import { Card, CardBody, Button, Image, Skeleton } from "@heroui/react";
import { Upload } from "lucide-react";

export function AvatarCard({
  uploadingAvatar,
  avatarUrl,
  onPickAvatar,
}: {
  uploadingAvatar: boolean;
  avatarUrl?: string | null;
  onPickAvatar: () => void;
}) {
  return (
    <Card>
      <CardBody>
        <div className="space-y-3 flex flex-col items-center justify-center">
          {uploadingAvatar ? (
            <Skeleton className="h-32 w-32 sm:h-40 sm:w-40 rounded-xl" />
          ) : (
            <Image
              src={avatarUrl || "/placeholder.png"}
              alt="Profile"
              className="rounded-xl h-32 w-32 sm:h-40 sm:w-40 object-cover object-center"
            />
          )}
          <Button
            startContent={<Upload size={14} />}
            variant="flat"
            size="sm"
            onPress={onPickAvatar}
            isLoading={uploadingAvatar}
            isDisabled={uploadingAvatar}
            className="w-full sm:w-auto"
          >
            {uploadingAvatar ? "Uploading..." : "Change photo"}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
