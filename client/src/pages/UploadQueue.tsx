import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Plus, Trash2, Clock, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function UploadQueue() {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedMediaId, setSelectedMediaId] = useState<number | null>(null);
  const [selectedPlatformId, setSelectedPlatformId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");

  const utils = trpc.useUtils();
  const { data: queueItems } = trpc.uploadQueue.list.useQuery({});
  const { data: platforms } = trpc.platforms.list.useQuery();
  const { data: mediaItems } = trpc.media.list.useQuery({ isApproved: true, limit: 100 });

  const createMutation = trpc.uploadQueue.create.useMutation({
    onSuccess: () => {
      toast.success("Added to upload queue");
      utils.uploadQueue.list.invalidate();
      setAddDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to add to queue");
    },
  });

  const deleteMutation = trpc.uploadQueue.delete.useMutation({
    onSuccess: () => {
      toast.success("Removed from queue");
      utils.uploadQueue.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to remove from queue");
    },
  });

  const resetForm = () => {
    setSelectedMediaId(null);
    setSelectedPlatformId(null);
    setTitle("");
    setDescription("");
    setPrice("");
  };

  const handleCreate = () => {
    if (!selectedMediaId || !selectedPlatformId) {
      toast.error("Please select media and platform");
      return;
    }

    createMutation.mutate({
      mediaItemId: selectedMediaId,
      platformId: selectedPlatformId,
      title: title || undefined,
      description: description || undefined,
      price: price ? Math.round(parseFloat(price) * 100) : undefined,
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to remove this from the queue?")) {
      deleteMutation.mutate({ id });
    }
  };

  const pendingItems = queueItems?.filter(item => item.status === "pending" || item.status === "scheduled");
  const processingItems = queueItems?.filter(item => item.status === "processing");
  const completedItems = queueItems?.filter(item => item.status === "completed");
  const failedItems = queueItems?.filter(item => item.status === "failed");

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
      case "scheduled":
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case "processing":
        return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
      case "completed":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
      case "scheduled":
        return "bg-yellow-500/10 text-yellow-500";
      case "processing":
        return "bg-blue-500/10 text-blue-500";
      case "completed":
        return "bg-green-500/10 text-green-500";
      case "failed":
        return "bg-red-500/10 text-red-500";
      default:
        return "bg-gray-500/10 text-gray-500";
    }
  };

  const renderQueueItem = (item: any) => {
    const media = mediaItems?.find(m => m.id === item.mediaItemId);
    const platform = platforms?.find(p => p.id === item.platformId);

    return (
      <Card key={item.id} className="overflow-hidden">
        <CardContent className="p-4">
          <div className="flex gap-4">
            {/* Thumbnail */}
            <div className="w-24 h-24 bg-muted rounded-lg overflow-hidden flex-shrink-0">
              {media?.thumbnailUrl || media?.storageUrl ? (
                <img
                  src={media.thumbnailUrl || media.storageUrl}
                  alt={media.filename}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                  No preview
                </div>
              )}
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-foreground truncate">
                    {item.title || media?.filename || "Untitled"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Platform: {platform?.name || "Unknown"}
                  </p>
                  {item.price && (
                    <p className="text-sm text-muted-foreground">
                      Price: ${(item.price / 100).toFixed(2)}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    {getStatusIcon(item.status)}
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                      {item.status}
                    </span>
                  </div>
                  {(item.status === "pending" || item.status === "failed") && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDelete(item.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
              {item.description && (
                <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                  {item.description}
                </p>
              )}
              {item.errorMessage && (
                <p className="text-sm text-red-500 mt-2">
                  Error: {item.errorMessage}
                </p>
              )}
              {item.platformUrl && (
                <a
                  href={item.platformUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline mt-2 inline-block"
                >
                  View on platform
                </a>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Upload Queue</h1>
            <p className="text-muted-foreground mt-1">
              Manage content uploads to platforms
            </p>
          </div>
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add to Queue
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{pendingItems?.length || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Processing</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{processingItems?.length || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{completedItems?.length || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Failed</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{failedItems?.length || 0}</p>
            </CardContent>
          </Card>
        </div>

        {/* Queue Items */}
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">All ({queueItems?.length || 0})</TabsTrigger>
            <TabsTrigger value="pending">Pending ({pendingItems?.length || 0})</TabsTrigger>
            <TabsTrigger value="completed">Completed ({completedItems?.length || 0})</TabsTrigger>
            <TabsTrigger value="failed">Failed ({failedItems?.length || 0})</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-3">
            {queueItems && queueItems.length > 0 ? (
              queueItems.map(renderQueueItem)
            ) : (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground">
                  No items in queue. Add approved content to start uploading.
                </p>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="pending" className="space-y-3">
            {pendingItems && pendingItems.length > 0 ? (
              pendingItems.map(renderQueueItem)
            ) : (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground">No pending uploads.</p>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="completed" className="space-y-3">
            {completedItems && completedItems.length > 0 ? (
              completedItems.map(renderQueueItem)
            ) : (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground">No completed uploads yet.</p>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="failed" className="space-y-3">
            {failedItems && failedItems.length > 0 ? (
              failedItems.map(renderQueueItem)
            ) : (
              <Card className="p-12 text-center">
                <p className="text-muted-foreground">No failed uploads.</p>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Add to Queue Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add to Upload Queue</DialogTitle>
            <DialogDescription>
              Select approved content and platform for upload
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="media">Media Item *</Label>
              <Select value={selectedMediaId?.toString()} onValueChange={(v) => setSelectedMediaId(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select media..." />
                </SelectTrigger>
                <SelectContent>
                  {mediaItems?.map((item) => (
                    <SelectItem key={item.id} value={item.id.toString()}>
                      {item.filename}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="platform">Platform *</Label>
              <Select value={selectedPlatformId?.toString()} onValueChange={(v) => setSelectedPlatformId(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select platform..." />
                </SelectTrigger>
                <SelectContent>
                  {platforms?.filter(p => p.status === "active").map((platform) => (
                    <SelectItem key={platform.id} value={platform.id.toString()}>
                      {platform.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="Post title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Post description..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div>
              <Label htmlFor="price">Price (USD)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                placeholder="9.99"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Adding..." : "Add to Queue"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

