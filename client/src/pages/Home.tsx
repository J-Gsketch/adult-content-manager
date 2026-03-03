import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import {
  Images, CheckCircle, AlertCircle, Upload,
  DollarSign, TrendingUp, ChevronRight, Plus,
  Download, Zap, Activity
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/useMobile";
import { useAuth } from "@/_core/hooks/useAuth";

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
  loading,
  onClick,
}: {
  label: string;
  value: string | number;
  sub: string;
  icon: React.ElementType;
  color: string;
  loading?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col gap-3 p-4 rounded-2xl bg-card border border-border text-left active:scale-95 transition-all duration-150 hover:border-primary/30 hover:shadow-md hover:shadow-primary/5"
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <div className={`h-8 w-8 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      {loading ? (
        <Skeleton className="h-8 w-16" />
      ) : (
        <span className="text-2xl font-bold tracking-tight">{value}</span>
      )}
      <span className="text-xs text-muted-foreground">{sub}</span>
    </button>
  );
}

function QuickAction({
  icon: Icon,
  label,
  desc,
  onClick,
  color,
}: {
  icon: React.ElementType;
  label: string;
  desc: string;
  onClick: () => void;
  color: string;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 p-4 rounded-2xl bg-card border border-border active:scale-95 transition-all duration-150 hover:border-primary/30 text-left w-full"
    >
      <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-xs text-muted-foreground truncate">{desc}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
    </button>
  );
}

export default function Home() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const isMobile = useIsMobile();

  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = trpc.media.stats.useQuery();
  const { data: galleries, isLoading: galleriesLoading } = trpc.galleries.list.useQuery();
  const { data: platforms, isLoading: platformsLoading } = trpc.platforms.list.useQuery();
  const { data: uploadQueue, isLoading: queueLoading } = trpc.uploadQueue.list.useQuery({});
  const { data: totalRevenue, isLoading: revenueLoading } = trpc.revenue.total.useQuery({});

  const pendingUploads = uploadQueue?.filter(i => i.status === "pending" || i.status === "scheduled").length || 0;
  const completedUploads = uploadQueue?.filter(i => i.status === "completed").length || 0;
  const activePlatforms = platforms?.filter(p => p.status === "active").length || 0;
  const pendingReview = (stats?.total || 0) - (stats?.approved || 0);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 18) return "Good afternoon";
    return "Good evening";
  };

  return (
    <DashboardLayout>
      <div className="space-y-5 max-w-2xl mx-auto">
        {/* Greeting */}
        <div className="pt-1">
          <p className="text-sm text-muted-foreground">{greeting()},</p>
          <h1 className="text-2xl font-bold tracking-tight">{user?.name?.split(" ")[0] || "Creator"} 👋</h1>
        </div>

        {/* Stats grid - 2 columns on mobile */}
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="Total Media"
            value={stats?.total || 0}
            sub={`${stats?.explicit || 0} explicit`}
            icon={Images}
            color="bg-blue-500/10 text-blue-500"
            loading={statsLoading}
            onClick={() => setLocation("/media-library")}
          />
          <StatCard
            label="Approved"
            value={stats?.approved || 0}
            sub="Ready to upload"
            icon={CheckCircle}
            color="bg-green-500/10 text-green-500"
            loading={statsLoading}
            onClick={() => setLocation("/media-library")}
          />
          <StatCard
            label="Pending"
            value={pendingReview}
            sub="Needs review"
            icon={AlertCircle}
            color="bg-amber-500/10 text-amber-500"
            loading={statsLoading}
            onClick={() => setLocation("/media-library")}
          />
          <StatCard
            label="Upload Queue"
            value={pendingUploads}
            sub={`${completedUploads} done`}
            icon={Upload}
            color="bg-purple-500/10 text-purple-500"
            loading={queueLoading}
            onClick={() => setLocation("/upload-queue")}
          />
          <StatCard
            label="Revenue"
            value={`$${((totalRevenue || 0) / 100).toFixed(2)}`}
            sub="All time"
            icon={DollarSign}
            color="bg-rose-500/10 text-rose-500"
            loading={revenueLoading}
            onClick={() => setLocation("/revenue")}
          />
          <StatCard
            label="Platforms"
            value={activePlatforms}
            sub={`${platforms?.length || 0} configured`}
            icon={TrendingUp}
            color="bg-cyan-500/10 text-cyan-500"
            loading={platformsLoading}
            onClick={() => setLocation("/settings")}
          />
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Quick Actions</h2>
          <div className="space-y-2">
            <QuickAction
              icon={Plus}
              label="Upload Content"
              desc="Add photos or videos to your library"
              color="bg-primary/10 text-primary"
              onClick={() => setLocation("/media-library")}
            />
            <QuickAction
              icon={Download}
              label="Import from Gallery"
              desc="Bulk import from Google Drive or URL"
              color="bg-blue-500/10 text-blue-500"
              onClick={() => setLocation("/import-jobs")}
            />
            <QuickAction
              icon={Zap}
              label="Prepare for Upload"
              desc="Optimize content for platforms"
              color="bg-amber-500/10 text-amber-500"
              onClick={() => setLocation("/upload-preparation")}
            />
            <QuickAction
              icon={Activity}
              label="View Revenue"
              desc="Track earnings across platforms"
              color="bg-green-500/10 text-green-500"
              onClick={() => setLocation("/revenue")}
            />
          </div>
        </div>

        {/* Connected Galleries */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Galleries</h2>
            <button
              onClick={() => setLocation("/settings")}
              className="text-xs text-primary font-medium active:opacity-70"
            >
              Manage
            </button>
          </div>
          {galleriesLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-16 w-full rounded-2xl" />
              <Skeleton className="h-16 w-full rounded-2xl" />
            </div>
          ) : galleries && galleries.length > 0 ? (
            <div className="space-y-2">
              {galleries.map((gallery) => (
                <div
                  key={gallery.id}
                  className="flex items-center gap-3 p-4 rounded-2xl bg-card border border-border"
                >
                  <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                    <Images className="h-5 w-5 text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{gallery.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {gallery.type.replace("_", " ")}
                    </p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    gallery.status === "active"
                      ? "bg-green-500/10 text-green-500"
                      : gallery.status === "error"
                      ? "bg-red-500/10 text-red-500"
                      : "bg-amber-500/10 text-amber-500"
                  }`}>
                    {gallery.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <button
              onClick={() => setLocation("/settings")}
              className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl border-2 border-dashed border-border text-muted-foreground hover:border-primary/30 hover:text-primary transition-all active:scale-95"
            >
              <Plus className="h-4 w-4" />
              <span className="text-sm font-medium">Connect a gallery</span>
            </button>
          )}
        </div>

        {/* Platform Status */}
        {platforms && platforms.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Platforms</h2>
              <button
                onClick={() => setLocation("/settings")}
                className="text-xs text-primary font-medium active:opacity-70"
              >
                Manage
              </button>
            </div>
            <div className="space-y-2">
              {platforms.slice(0, 3).map((platform) => (
                <div
                  key={platform.id}
                  className="flex items-center gap-3 p-4 rounded-2xl bg-card border border-border"
                >
                  <div className="h-10 w-10 rounded-xl bg-rose-500/10 flex items-center justify-center shrink-0">
                    <TrendingUp className="h-5 w-5 text-rose-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{platform.name}</p>
                    {platform.handle && (
                      <p className="text-xs text-muted-foreground">@{platform.handle}</p>
                    )}
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                    platform.status === "active"
                      ? "bg-green-500/10 text-green-500"
                      : platform.status === "error"
                      ? "bg-red-500/10 text-red-500"
                      : "bg-gray-500/10 text-gray-500"
                  }`}>
                    {platform.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
