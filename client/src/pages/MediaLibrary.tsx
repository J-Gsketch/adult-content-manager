import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { 
  Upload, 
  Search, 
  Filter, 
  CheckCircle, 
  XCircle, 
  Sparkles,
  Trash2,
  Eye,
  MoreVertical
} from "lucide-react";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function MediaLibrary() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterExplicit, setFilterExplicit] = useState<boolean | undefined>(undefined);
  const [filterApproved, setFilterApproved] = useState<boolean | undefined>(undefined);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<any>(null);

  const utils = trpc.useUtils();
  const { data: mediaItems, isLoading } = trpc.media.list.useQuery({
    isExplicit: filterExplicit,
    isApproved: filterApproved,
    limit: 100,
  });

  const uploadMutation = trpc.media.upload.useMutation({
    onSuccess: () => {
      toast.success("Media uploaded successfully");
      utils.media.list.invalidate();
      utils.media.stats.invalidate();
      setUploadDialogOpen(false);
      setSelectedFile(null);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to upload media");
    },
  });

  const updateMutation = trpc.media.update.useMutation({
    onSuccess: () => {
      toast.success("Media updated successfully");
      utils.media.list.invalidate();
      utils.media.stats.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to update media");
    },
  });

  const deleteMutation = trpc.media.delete.useMutation({
    onSuccess: () => {
      toast.success("Media deleted successfully");
      utils.media.list.invalidate();
      utils.media.stats.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete media");
    },
  });

  const analyzeMutation = trpc.media.analyzeContent.useMutation({
    onSuccess: () => {
      toast.success("Content analysis completed");
      utils.media.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to analyze content");
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result?.toString().split(",")[1];
      if (base64) {
        uploadMutation.mutate({
          filename: selectedFile.name,
          mimeType: selectedFile.type,
          fileData: base64,
        });
      }
    };
    reader.readAsDataURL(selectedFile);
  };

  const handleApprove = (id: number, currentStatus: boolean) => {
    updateMutation.mutate({
      id,
      isApproved: !currentStatus,
    });
  };

  const handleMarkExplicit = (id: number, currentStatus: boolean) => {
    updateMutation.mutate({
      id,
      isExplicit: !currentStatus,
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Are you sure you want to delete this media item?")) {
      deleteMutation.mutate({ id });
    }
  };

  const handleAnalyze = (id: number) => {
    analyzeMutation.mutate({ id });
    toast.info("Starting AI analysis...");
  };

  const filteredMedia = mediaItems?.filter(item =>
    item.filename.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Media Library</h1>
            <p className="text-muted-foreground mt-1">
              Manage and organize your content
            </p>
          </div>
          <Button onClick={() => setUploadDialogOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Upload Media
          </Button>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search media..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant={filterExplicit === true ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterExplicit(filterExplicit === true ? undefined : true)}
              >
                <Filter className="w-4 h-4 mr-2" />
                Explicit
              </Button>
              <Button
                variant={filterApproved === true ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterApproved(filterApproved === true ? undefined : true)}
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Approved
              </Button>
            </div>
          </div>
        </Card>

        {/* Media Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {[...Array(10)].map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-lg" />
            ))}
          </div>
        ) : filteredMedia && filteredMedia.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredMedia.map((item) => (
              <Card key={item.id} className="overflow-hidden group relative">
                <div className="aspect-square relative bg-muted">
                  {item.mimeType.startsWith("image/") ? (
                    <img
                      src={item.thumbnailUrl || item.storageUrl}
                      alt={item.filename}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-muted-foreground text-sm">Video</span>
                    </div>
                  )}
                  
                  {/* Overlay with actions */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button
                      size="icon"
                      variant="secondary"
                      onClick={() => {
                        setSelectedMedia(item);
                        setViewDialogOpen(true);
                      }}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="secondary">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => handleApprove(item.id, item.isApproved)}>
                          {item.isApproved ? "Unapprove" : "Approve"}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleMarkExplicit(item.id, item.isExplicit)}>
                          {item.isExplicit ? "Mark Safe" : "Mark Explicit"}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleAnalyze(item.id)}>
                          <Sparkles className="w-4 h-4 mr-2" />
                          Analyze with AI
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDelete(item.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Status badges */}
                  <div className="absolute top-2 right-2 flex gap-1">
                    {item.isExplicit && (
                      <span className="bg-red-500 text-white text-xs px-2 py-1 rounded">
                        18+
                      </span>
                    )}
                    {item.isApproved && (
                      <span className="bg-green-500 text-white text-xs px-2 py-1 rounded">
                        ✓
                      </span>
                    )}
                  </div>
                </div>
                <div className="p-2">
                  <p className="text-xs text-foreground truncate font-medium">
                    {item.filename}
                  </p>
                  {item.nsfwScore !== null && (
                    <p className="text-xs text-muted-foreground">
                      NSFW: {item.nsfwScore}%
                    </p>
                  )}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">
              No media found. Upload some content to get started.
            </p>
          </Card>
        )}
      </div>

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Media</DialogTitle>
            <DialogDescription>
              Select an image or video file to upload
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="file">File</Label>
              <Input
                id="file"
                type="file"
                accept="image/*,video/*"
                onChange={handleFileSelect}
              />
            </div>
            {selectedFile && (
              <p className="text-sm text-muted-foreground">
                Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpload} disabled={!selectedFile || uploadMutation.isPending}>
              {uploadMutation.isPending ? "Uploading..." : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{selectedMedia?.filename}</DialogTitle>
          </DialogHeader>
          {selectedMedia && (
            <div className="space-y-4">
              <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                {selectedMedia.mimeType.startsWith("image/") ? (
                  <img
                    src={selectedMedia.storageUrl}
                    alt={selectedMedia.filename}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <video src={selectedMedia.storageUrl} controls className="w-full h-full" />
                )}
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <p className="font-medium">
                    {selectedMedia.isApproved ? "Approved" : "Pending Review"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Content Type</p>
                  <p className="font-medium">
                    {selectedMedia.isExplicit ? "Explicit (18+)" : "Safe"}
                  </p>
                </div>
                {selectedMedia.nsfwScore !== null && (
                  <div>
                    <p className="text-muted-foreground">NSFW Score</p>
                    <p className="font-medium">{selectedMedia.nsfwScore}%</p>
                  </div>
                )}
                {selectedMedia.fileSize && (
                  <div>
                    <p className="text-muted-foreground">File Size</p>
                    <p className="font-medium">
                      {(selectedMedia.fileSize / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                )}
              </div>
              {selectedMedia.notes && (
                <div>
                  <p className="text-muted-foreground text-sm">Notes</p>
                  <p className="text-sm">{selectedMedia.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

