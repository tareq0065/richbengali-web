"use client";

import { useMemo, useState } from "react";
import { useListUsersQuery } from "@/store/api";
import UserCard from "@/components/UserCard";
import UserFilters, { Filters } from "@/components/UserFilters";
import UserGridSkeleton from "@/components/UserGridSkeleton";

export default function HomePage() {
  const [filters, setFilters] = useState<Filters>({});

  const queryArgs = useMemo(
    () => ({
      cityStartsWith: filters.city || undefined,
      minAge: filters.minAge,
      maxAge: filters.maxAge,
    }),
    [filters.city, filters.minAge, filters.maxAge],
  );

  const { data: users, isFetching, isLoading } = useListUsersQuery(queryArgs);

  const hasActiveFilters =
    !!(filters.city && filters.city.trim().length) ||
    typeof filters.minAge === "number" ||
    typeof filters.maxAge === "number";

  const handleApply = (next: Filters) => {
    setFilters(next); // RTK Query will auto-refetch because args changed
  };

  const handleClear = () => {
    setFilters({});
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Discover Your Best Match</h1>

        <UserFilters
          initial={filters}
          onApply={handleApply}
          onClear={handleClear}
          hasActiveFilters={hasActiveFilters}
        />
      </div>

      {isLoading || (isFetching && !users?.length) ? (
        <UserGridSkeleton />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {(users || []).map((u) => (
            <UserCard key={u.id} user={u} />
          ))}
        </div>
      )}

      {!isFetching && (!users || users.length === 0) && (
        <div className="text-center text-sm text-default-500 py-12">
          No matches yet — try widening your filters or check back soon ✨
        </div>
      )}
    </div>
  );
}
