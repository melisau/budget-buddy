import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
  return (
    <div className="dashboard-skeleton" aria-label="Loading dashboard" aria-busy="true">
      <div className="stats">
        {[1, 2, 3, 4].map((item) => (
          <div className="panel" key={item}>
            <Skeleton className="h-10 w-10 rounded-xl" />
            <Skeleton className="mt-5 h-3 w-24" />
            <Skeleton className="mt-3 h-7 w-36" />
            <Skeleton className="mt-3 h-3 w-28" />
          </div>
        ))}
      </div>
      <div className="dash">
        <Skeleton className="h-72 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    </div>
  );
}
