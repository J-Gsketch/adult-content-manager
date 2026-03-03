import { Skeleton } from "@/components/ui/skeleton";

export function StatCardSkeleton() {
  return (
    <div className="rounded-2xl border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-8 rounded-xl" />
      </div>
      <Skeleton className="h-8 w-16" />
      <Skeleton className="h-3 w-20" />
    </div>
  );
}

export function MediaCardSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden border bg-card">
      <Skeleton className="aspect-square w-full" />
      <div className="p-3 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

export function ListItemSkeleton() {
  return (
    <div className="flex items-center gap-3 p-4 rounded-2xl border bg-card">
      <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="h-6 w-16 rounded-full" />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3">
        {[...Array(6)].map((_, i) => <StatCardSkeleton key={i} />)}
      </div>
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => <ListItemSkeleton key={i} />)}
      </div>
    </div>
  );
}

export function MediaGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3">
      {[...Array(8)].map((_, i) => <MediaCardSkeleton key={i} />)}
    </div>
  );
}

export function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {[...Array(count)].map((_, i) => <ListItemSkeleton key={i} />)}
    </div>
  );
}
