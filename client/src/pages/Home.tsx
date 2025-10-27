import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Images, CheckCircle, AlertCircle, Upload, DollarSign, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export default function Home() {
  const { data: stats, isLoading: statsLoading } = trpc.media.stats.useQuery();
  const { data: galleries, isLoading: galleriesLoading } = trpc.galleries.list.useQuery();
  const { data: platforms, isLoading: platformsLoading } = trpc.platforms.list.useQuery();
  const { data: uploadQueue, isLoading: queueLoading } = trpc.uploadQueue.list.useQuery({});
  const { data: totalRevenue, isLoading: revenueLoading } = trpc.revenue.total.useQuery({});

  const pendingUploads = uploadQueue?.filter(item => item.status === "pending" || item.status === "scheduled").length || 0;
  const completedUploads = uploadQueue?.filter(item => item.status === "completed").length || 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Manage your adult content library and monetization
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Total Media */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Media</CardTitle>
              <Images className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{stats?.total || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats?.explicit || 0} explicit items
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Approved Content */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approved Content</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{stats?.approved || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Ready for upload
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Pending Review */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {(stats?.total || 0) - (stats?.approved || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Needs approval
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Upload Queue */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Upload Queue</CardTitle>
              <Upload className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {queueLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <div className="text-2xl font-bold">{pendingUploads}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {completedUploads} completed
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Total Revenue */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {revenueLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    ${((totalRevenue || 0) / 100).toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    All time earnings
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Active Platforms */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Platforms</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {platformsLoading ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {platforms?.filter(p => p.status === "active").length || 0}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {platforms?.length || 0} total configured
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Connected Galleries */}
          <Card>
            <CardHeader>
              <CardTitle>Connected Galleries</CardTitle>
              <CardDescription>
                Your photo gallery connections
              </CardDescription>
            </CardHeader>
            <CardContent>
              {galleriesLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : galleries && galleries.length > 0 ? (
                <div className="space-y-2">
                  {galleries.map((gallery) => (
                    <div
                      key={gallery.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border"
                    >
                      <div>
                        <p className="font-medium text-foreground">{gallery.name}</p>
                        <p className="text-sm text-muted-foreground capitalize">
                          {gallery.type.replace("_", " ")}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          gallery.status === "active"
                            ? "bg-green-500/10 text-green-500"
                            : gallery.status === "error"
                            ? "bg-red-500/10 text-red-500"
                            : "bg-yellow-500/10 text-yellow-500"
                        }`}
                      >
                        {gallery.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No galleries connected yet. Go to Settings to add one.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Platform Status */}
          <Card>
            <CardHeader>
              <CardTitle>Platform Status</CardTitle>
              <CardDescription>
                Your monetization platforms
              </CardDescription>
            </CardHeader>
            <CardContent>
              {platformsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : platforms && platforms.length > 0 ? (
                <div className="space-y-2">
                  {platforms.map((platform) => (
                    <div
                      key={platform.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border"
                    >
                      <div>
                        <p className="font-medium text-foreground">{platform.name}</p>
                        {platform.handle && (
                          <p className="text-sm text-muted-foreground">@{platform.handle}</p>
                        )}
                      </div>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          platform.status === "active"
                            ? "bg-green-500/10 text-green-500"
                            : platform.status === "error"
                            ? "bg-red-500/10 text-red-500"
                            : "bg-gray-500/10 text-gray-500"
                        }`}
                      >
                        {platform.status}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No platforms configured yet. Go to Settings to add one.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

