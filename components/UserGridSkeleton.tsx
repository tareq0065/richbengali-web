"use client";

import { Card, CardBody, Skeleton } from "@heroui/react";

type Props = { count?: number };

export default function UserGridSkeleton({ count = 8 }: Props) {
  const placeholders = Array.from({ length: count });

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {placeholders.map((_, i) => (
        <Card key={i} className="hover:shadow-lg transition-shadow">
          <CardBody className="p-3 space-y-2">
            {/* Image block */}
            <div className="aspect-square w-full overflow-hidden rounded-lg bg-gray-100">
              <Skeleton className="w-full h-full rounded-lg" />
            </div>

            {/* Name + age row */}
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-3/4 rounded-md" />
              <Skeleton className="h-3 w-10 rounded-md" />
            </div>

            {/* City line */}
            <Skeleton className="h-3 w-1/2 rounded-md" />

            {/* View button */}
            <Skeleton className="h-8 w-full rounded-md" />
          </CardBody>
        </Card>
      ))}
    </div>
  );
}
