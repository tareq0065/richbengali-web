// app/favorites/page.tsx
"use client";

import Link from "next/link";
import { useFavoritesQuery } from "@/store/api";
import UserCard from "@/components/UserCard";
import { Card, CardBody, Button } from "@heroui/react";
import { Heart } from "lucide-react";
import UserGridSkeleton from "@/components/UserGridSkeleton";

export default function FavoritesPage() {
  const { data, isLoading } = useFavoritesQuery();
  const users = data ?? [];

  if (isLoading) {
    return <UserGridSkeleton />;
  }

  if (users.length === 0) {
    return (
      <div className="max-w-xl mx-auto p-6">
        <Card>
          <CardBody className="flex flex-col items-center text-center gap-3 py-10">
            <div className="rounded-full p-3 bg-default-100">
              <Heart size={22} />
            </div>
            <h2 className="text-lg font-semibold">No favorites yet</h2>
            <p className="text-sm text-default-500">
              Tap the heart icon on profiles you like. They’ll show up here.
            </p>
            <Button as={Link} href="/home" color="primary" variant="flat" size="sm">
              Browse people
            </Button>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {users.map((u) => (
        <UserCard key={u.id} user={u} />
      ))}
    </div>
  );
}
