import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { 
  Upload, 
  Search, 
  CheckCircle, 
  XCircle, 
  Sparkles,
  Trash2,
  Eye,
  X,
  FileImage
} from "lucide-react";
import { useState, useRef, DragEvent } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

export default function MediaLibrary() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterExplicit, setFilterExplicit] = useState<boolean | undefined>(undefined);
  const [filterApproved, setFilterApproved] = useState<boolean | undefined>(undefined);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, { progress: number; status: string }>>({});
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();
  const { data: mediaItems, isLoading } = trpc.media.list.useQuery({
    isExplicit: filterExplicit,
    isApproved: filterApproved,
    limit: 100,
  });

  const uploadMutation = trpc.media.upload.useMutation({
    onSuccess: () => {
      utils.media.list.invalidate();
      utils.media.stats.invalidate();
    },
  });

  const approveMutation = trpc.media.approve.useMutation({
    onSuccess: () => {
      utils.media.list.invalidate();
      utils.media.stats.invalidate();
      toast.success("Content approved");
    },
  });

  const deleteMutation = trpc.media.delete.useMutation({
    onSuccess: () => {
      utils.media.list.invalidate();
      utils.media.stats.invalidate();
      toast.success("Content deleted");
    },
  });

  // Drag and drop handlers
  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files).filter(
      file => file.type.startsWith('image/') || file.type.startsWith('video/')
    );

    if (files.length > 0) {
      setSelectedFiles(prev => [...prev, ...files]);
      toast.success(`${files.length} file(s) added to upload queue`);
    } else {
      toast.error("Please drop image or video files only");
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const fileArray = Array.from(files);
      setSelectedFiles(prev => [...prev, ...fileArray]);
      toast.success(`${fileArray.length} file(s) added to upload queue`);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleBatchUpload = async () => {
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const fileKey = `${file.name}-${i}`;

      try {
        setUploadProgress(prev => ({
          ...prev,
          [fileKey]: { progress: 0, status: 'uploading' }
        }));

        // Read file as base64
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        // Simulate progress
        setUploadProgress(prev => ({
          ...prev,
          [fileKey]: { progress: 50, status: 'uploading' }
        }));

        // Upload to server
        await uploadMutation.mutateAsync({
          filename: file.name,
          mimeType: file.type,
          fileData: base64,
        });

        setUploadProgress(prev => ({
          ...prev,
          [fileKey]: { progress: 100, status: 'completed' }
        }));

        successCount++;
      } catch (error: any) {
        setUploadProgress(prev => ({
          ...prev,
          [fileKey]: { progress: 0, status: 'failed' }
        }));
        failCount++;
        console.error(`Failed to upload ${file.name}:`, error);
      }
    }

    setIsUploading(false);
    
    if (successCount > 0) {
      toast.success(`Successfully uploaded ${successCount} file(s). AI analysis in progress...`);
    }
    if (failCount > 0) {
      toast.error(`Failed to upload ${failCount} file(s)`);
    }

    // Clear after a delay
    setTimeout(() => {
      setSelectedFiles([]);
      setUploadProgress({});
    }, 3000);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Media Library</h1>
            <p className="text-muted-foreground mt-1">
              Upload and manage your content
            </p>
          </div>
          <Button onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4 mr-2" />
            Upload Files
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*"
            className="hidden"
            onChange={handleFileSelect}
          />
        </div>

        {/* Drag and Drop Upload Zone */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 transition-colors ${
            isDragging 
              ? 'border-primary bg-primary/5' 
              : 'border-border bg-muted/20'
          }`}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <div className="p-4 bg-primary/10 rounded-full">
              <Upload className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-1">
                Drag & Drop Files Here
              </h3>
              <p className="text-sm text-muted-foreground">
                or click the Upload Files button above
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Supports images and videos • AI will automatically analyze and categorize
              </p>
            </div>
          </div>
        </div>

        {/* Upload Queue */}
        {selectedFiles.length > 0 && (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  Upload Queue ({selectedFiles.length} files)
                </h3>
                <Button 
                  onClick={handleBatchUpload}
                  disabled={isUploading}
                >
                  {isUploading ? 'Uploading...' : 'Upload All'}
                </Button>
              </div>
              
              <div className="space-y-3">
                {selectedFiles.map((file, index) => {
                  const fileKey = `${file.name}-${index}`;
                  const progress = uploadProgress[fileKey];
                  
                  return (
                    <div key={fileKey} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      <FileImage className="h-8 w-8 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                        {progress && (
                          <div className="mt-2">
                            <Progress value={progress.progress} className="h-1" />
                          </div>
                        )}
                      </div>
                      {progress && (
                        <Badge variant={
                          progress.status === 'completed' ? 'default' :
                          progress.status === 'failed' ? 'destructive' :
                          'secondary'
                        }>
                          {progress.status}
                        </Badge>
                      )}
                      {!isUploading && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeFile(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search and Filters */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search media..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            variant={filterExplicit === true ? "default" : "outline"}
            onClick={() => setFilterExplicit(filterExplicit === true ? undefined : true)}
          >
            Explicit Only
          </Button>
          <Button
            variant={filterApproved === true ? "default" : "outline"}
            onClick={() => setFilterApproved(filterApproved === true ? undefined : true)}
          >
            Approved Only
          </Button>
        </div>

        {/* Media Grid */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-lg" />
            ))}
          </div>
        ) : mediaItems && mediaItems.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {mediaItems.map((item) => (
              <Card key={item.id} className="overflow-hidden group relative">
                <div className="aspect-square bg-muted relative">
                  <img
                    src={item.storageUrl}
                    alt={item.filename}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        setSelectedMedia(item);
                        setViewDialogOpen(true);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    {!item.isApproved && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => approveMutation.mutate({ id: item.id })}
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        if (confirm("Delete this content?")) {
                          deleteMutation.mutate({ id: item.id });
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 mb-2">
                    {item.isExplicit && (
                      <Badge variant="destructive" className="text-xs">
                        Explicit
                      </Badge>
                    )}
                    {item.isApproved && (
                      <Badge variant="default" className="text-xs">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Approved
                      </Badge>
                    )}
                    {item.aiAnalysisStatus === "pending" && (
                      <Badge variant="secondary" className="text-xs">
                        <Sparkles className="h-3 w-3 mr-1" />
                        Analyzing
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm font-medium truncate">{item.filename}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FileImage className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Media Yet</h3>
              <p className="text-muted-foreground text-center mb-4">
                Upload your first files to get started
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>{selectedMedia?.filename}</DialogTitle>
          </DialogHeader>
          {selectedMedia && (
            <div className="space-y-4">
              <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                <img
                  src={selectedMedia.storageUrl}
                  alt={selectedMedia.filename}
                  className="w-full h-full object-contain"
                />
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
                    {selectedMedia.isExplicit ? "Explicit" : "Safe"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">AI Analysis</p>
                  <p className="font-medium">{selectedMedia.aiAnalysisStatus}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">File Size</p>
                  <p className="font-medium">
                    {selectedMedia.fileSize 
                      ? `${(selectedMedia.fileSize / 1024 / 1024).toFixed(2)} MB`
                      : "Unknown"}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
