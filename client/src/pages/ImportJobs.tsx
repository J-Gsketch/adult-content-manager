import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Plus, Play, Pause, Trash2, CheckCircle, XCircle, Clock, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export default function ImportJobs() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newJobName, setNewJobName] = useState("");
  const [sourceType, setSourceType] = useState<"google_drive" | "url" | "local_folder">("url");
  const [sourcePath, setSourcePath] = useState("");
  
  const { data: jobs, isLoading, refetch } = trpc.importJobs.list.useQuery();
  const createJob = trpc.importJobs.create.useMutation({
    onSuccess: () => {
      toast.success("Import job created successfully");
      setIsCreateDialogOpen(false);
      setNewJobName("");
      setSourcePath("");
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to create job: ${error.message}`);
    },
  });
  
  const startJob = trpc.importJobs.start.useMutation({
    onSuccess: () => {
      toast.success("Import job started");
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to start job: ${error.message}`);
    },
  });
  
  const deleteJob = trpc.importJobs.delete.useMutation({
    onSuccess: () => {
      toast.success("Import job deleted");
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to delete job: ${error.message}`);
    },
  });

  const handleCreateJob = () => {
    if (!newJobName || !sourcePath) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    createJob.mutate({
      name: newJobName,
      sourceType,
      sourcePath,
      isRecurring: false,
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline", icon: any }> = {
      pending: { variant: "secondary", icon: Clock },
      running: { variant: "default", icon: Loader2 },
      completed: { variant: "outline", icon: CheckCircle },
      failed: { variant: "destructive", icon: XCircle },
      paused: { variant: "outline", icon: Pause },
    };
    
    const config = variants[status] || variants.pending;
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className={`h-3 w-3 ${status === 'running' ? 'animate-spin' : ''}`} />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Automated Import Jobs</h1>
            <p className="text-muted-foreground mt-1">
              Configure bulk import jobs with automatic categorization
            </p>
          </div>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Import Job
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Import Job</DialogTitle>
                <DialogDescription>
                  Set up an automated import job to bulk process content
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Job Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Import from Google Drive"
                    value={newJobName}
                    onChange={(e) => setNewJobName(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="sourceType">Source Type</Label>
                  <Select value={sourceType} onValueChange={(value: any) => setSourceType(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="url">URL / Public Album</SelectItem>
                      <SelectItem value="google_drive">Google Drive Folder</SelectItem>
                      <SelectItem value="local_folder">Local Folder Path</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="sourcePath">
                    {sourceType === "url" ? "Album URL" : sourceType === "google_drive" ? "Drive Folder ID" : "Folder Path"}
                  </Label>
                  <Input
                    id="sourcePath"
                    placeholder={
                      sourceType === "url" 
                        ? "https://photos.app.goo.gl/..." 
                        : sourceType === "google_drive"
                        ? "1a2b3c4d5e6f..."
                        : "/path/to/folder"
                    }
                    value={sourcePath}
                    onChange={(e) => setSourcePath(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    {sourceType === "url" && "Paste the public sharing link to a Google Photos album"}
                    {sourceType === "google_drive" && "Enter the Google Drive folder ID from the URL"}
                    {sourceType === "local_folder" && "Enter the full path to the local folder"}
                  </p>
                </div>
                
                <div className="bg-muted/50 p-4 rounded-lg border border-border">
                  <p className="text-sm font-medium mb-1">✨ Fully Automated Processing</p>
                  <p className="text-xs text-muted-foreground">
                    AI will automatically analyze, categorize, and tag all imported content. No manual selection needed!
                  </p>
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateJob} disabled={createJob.isPending}>
                  {createJob.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Create Job
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : jobs && jobs.length > 0 ? (
          <div className="grid gap-4">
            {jobs.map((job) => {
              const progress = (job.totalItems ?? 0) > 0 
                ? ((job.processedItems ?? 0) / (job.totalItems ?? 1)) * 100 
                : 0;
              
              return (
                <Card key={job.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <CardTitle className="text-xl">{job.name}</CardTitle>
                        <CardDescription>
                          Source: {job.sourceType.replace(/_/g, " ")} • {job.sourcePath}
                        </CardDescription>
                      </div>
                      {getStatusBadge(job.status)}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {(job.totalItems ?? 0) > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-medium">{job.processedItems} / {job.totalItems}</span>
                        </div>
                        <Progress value={progress} />
                      </div>
                    )}
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Successful</p>
                        <p className="font-medium text-green-600">{job.successfulItems}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Failed</p>
                        <p className="font-medium text-red-600">{job.failedItems}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Duplicates</p>
                        <p className="font-medium text-yellow-600">{job.duplicateItems}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Created</p>
                        <p className="font-medium">{new Date(job.createdAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      {(job.status === "pending" || job.status === "paused") && (
                        <Button 
                          size="sm" 
                          onClick={() => startJob.mutate({ id: job.id })}
                          disabled={startJob.isPending}
                        >
                          <Play className="h-4 w-4 mr-2" />
                          Start
                        </Button>
                      )}
                      
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => {
                          if (confirm("Are you sure you want to delete this import job?")) {
                            deleteJob.mutate({ id: job.id });
                          }
                        }}
                        disabled={deleteJob.isPending}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                    
                    {job.errorMessage && (
                      <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
                        {job.errorMessage}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Clock className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Import Jobs Yet</h3>
              <p className="text-muted-foreground text-center mb-4">
                Create your first automated import job to start bulk processing content
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Import Job
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

