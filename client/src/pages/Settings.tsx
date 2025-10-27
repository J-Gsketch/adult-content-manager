import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Plus, Trash2 } from "lucide-react";
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

export default function Settings() {
  const [galleryDialogOpen, setGalleryDialogOpen] = useState(false);
  const [platformDialogOpen, setPlatformDialogOpen] = useState(false);
  
  const [galleryName, setGalleryName] = useState("");
  const [galleryType, setGalleryType] = useState<"google_photos" | "local" | "dropbox" | "onedrive">("local");
  
  const [platformName, setPlatformName] = useState("");
  const [platformType, setPlatformType] = useState("");
  const [platformHandle, setPlatformHandle] = useState("");
  const [platformBio, setPlatformBio] = useState("");
  const [platformUrl, setPlatformUrl] = useState("");

  const utils = trpc.useUtils();
  const { data: galleries } = trpc.galleries.list.useQuery();
  const { data: platforms } = trpc.platforms.list.useQuery();

  const createGalleryMutation = trpc.galleries.create.useMutation({
    onSuccess: () => {
      toast.success("Gallery added successfully");
      utils.galleries.list.invalidate();
      setGalleryDialogOpen(false);
      resetGalleryForm();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to add gallery");
    },
  });

  const deleteGalleryMutation = trpc.galleries.delete.useMutation({
    onSuccess: () => {
      toast.success("Gallery deleted successfully");
      utils.galleries.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete gallery");
    },
  });

  const createPlatformMutation = trpc.platforms.create.useMutation({
    onSuccess: () => {
      toast.success("Platform added successfully");
      utils.platforms.list.invalidate();
      setPlatformDialogOpen(false);
      resetPlatformForm();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to add platform");
    },
  });

  const deletePlatformMutation = trpc.platforms.delete.useMutation({
    onSuccess: () => {
      toast.success("Platform deleted successfully");
      utils.platforms.list.invalidate();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete platform");
    },
  });

  const resetGalleryForm = () => {
    setGalleryName("");
    setGalleryType("local");
  };

  const resetPlatformForm = () => {
    setPlatformName("");
    setPlatformType("");
    setPlatformHandle("");
    setPlatformBio("");
    setPlatformUrl("");
  };

  const handleCreateGallery = () => {
    if (!galleryName.trim()) {
      toast.error("Please enter a gallery name");
      return;
    }
    createGalleryMutation.mutate({
      name: galleryName,
      type: galleryType,
    });
  };

  const handleCreatePlatform = () => {
    if (!platformName.trim() || !platformType.trim()) {
      toast.error("Please fill in required fields");
      return;
    }
    createPlatformMutation.mutate({
      name: platformName,
      type: platformType,
      handle: platformHandle || undefined,
      bio: platformBio || undefined,
      profileUrl: platformUrl || undefined,
    });
  };

  const handleDeleteGallery = (id: number) => {
    if (confirm("Are you sure you want to delete this gallery?")) {
      deleteGalleryMutation.mutate({ id });
    }
  };

  const handleDeletePlatform = (id: number) => {
    if (confirm("Are you sure you want to delete this platform?")) {
      deletePlatformMutation.mutate({ id });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-1">
            Manage your galleries and platforms
          </p>
        </div>

        <Tabs defaultValue="galleries" className="space-y-6">
          <TabsList>
            <TabsTrigger value="galleries">Photo Galleries</TabsTrigger>
            <TabsTrigger value="platforms">Monetization Platforms</TabsTrigger>
          </TabsList>

          <TabsContent value="galleries" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Photo Galleries</CardTitle>
                    <CardDescription>
                      Connect your photo galleries to import content
                    </CardDescription>
                  </div>
                  <Button onClick={() => setGalleryDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Gallery
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {galleries && galleries.length > 0 ? (
                  <div className="space-y-3">
                    {galleries.map((gallery) => (
                      <div
                        key={gallery.id}
                        className="flex items-center justify-between p-4 rounded-lg border border-border"
                      >
                        <div>
                          <p className="font-medium text-foreground">{gallery.name}</p>
                          <p className="text-sm text-muted-foreground capitalize">
                            {gallery.type.replace("_", " ")}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              gallery.status === "active"
                                ? "bg-green-500/10 text-green-500"
                                : gallery.status === "error"
                                ? "bg-red-500/10 text-red-500"
                                : "bg-yellow-500/10 text-yellow-500"
                            }`}
                          >
                            {gallery.status}
                          </span>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDeleteGallery(gallery.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No galleries connected yet. Click "Add Gallery" to get started.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Google Photos Setup</CardTitle>
                <CardDescription>
                  How to connect your Google Photos account
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>To connect Google Photos, you'll need to:</p>
                <ol className="list-decimal list-inside space-y-2 ml-2">
                  <li>Go to Google Cloud Console and create a new project</li>
                  <li>Enable the Google Photos Library API</li>
                  <li>Create OAuth 2.0 credentials (Desktop application type)</li>
                  <li>Download the credentials.json file</li>
                  <li>Upload the credentials when adding a Google Photos gallery</li>
                </ol>
                <p className="text-xs italic">
                  Note: Due to security restrictions, you'll need to manually set up API credentials.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="platforms" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Monetization Platforms</CardTitle>
                    <CardDescription>
                      Configure platforms where you'll upload and monetize content
                    </CardDescription>
                  </div>
                  <Button onClick={() => setPlatformDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Platform
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {platforms && platforms.length > 0 ? (
                  <div className="space-y-3">
                    {platforms.map((platform) => (
                      <div
                        key={platform.id}
                        className="flex items-center justify-between p-4 rounded-lg border border-border"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-foreground">{platform.name}</p>
                          <div className="flex gap-4 mt-1">
                            {platform.handle && (
                              <p className="text-sm text-muted-foreground">@{platform.handle}</p>
                            )}
                            {platform.profileUrl && (
                              <a
                                href={platform.profileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-primary hover:underline"
                              >
                                View Profile
                              </a>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              platform.status === "active"
                                ? "bg-green-500/10 text-green-500"
                                : platform.status === "error"
                                ? "bg-red-500/10 text-red-500"
                                : "bg-gray-500/10 text-gray-500"
                            }`}
                          >
                            {platform.status}
                          </span>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDeletePlatform(platform.id)}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No platforms configured yet. Click "Add Platform" to get started.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Supported Platforms</CardTitle>
                <CardDescription>
                  Popular adult content platforms you can connect
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  <div className="p-3 rounded-lg border border-border">OnlyFans</div>
                  <div className="p-3 rounded-lg border border-border">Fansly</div>
                  <div className="p-3 rounded-lg border border-border">ManyVids</div>
                  <div className="p-3 rounded-lg border border-border">LoyalFans</div>
                  <div className="p-3 rounded-lg border border-border">Clips4Sale</div>
                  <div className="p-3 rounded-lg border border-border">Custom</div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Gallery Dialog */}
      <Dialog open={galleryDialogOpen} onOpenChange={setGalleryDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Photo Gallery</DialogTitle>
            <DialogDescription>
              Connect a photo gallery to import content
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="gallery-name">Gallery Name</Label>
              <Input
                id="gallery-name"
                placeholder="My Gallery"
                value={galleryName}
                onChange={(e) => setGalleryName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="gallery-type">Type</Label>
              <Select value={galleryType} onValueChange={(v: any) => setGalleryType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="local">Local Files</SelectItem>
                  <SelectItem value="google_photos">Google Photos</SelectItem>
                  <SelectItem value="dropbox">Dropbox</SelectItem>
                  <SelectItem value="onedrive">OneDrive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGalleryDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateGallery} disabled={createGalleryMutation.isPending}>
              {createGalleryMutation.isPending ? "Adding..." : "Add Gallery"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Platform Dialog */}
      <Dialog open={platformDialogOpen} onOpenChange={setPlatformDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Monetization Platform</DialogTitle>
            <DialogDescription>
              Configure a platform for uploading and monetizing content
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="platform-name">Platform Name *</Label>
              <Input
                id="platform-name"
                placeholder="OnlyFans"
                value={platformName}
                onChange={(e) => setPlatformName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="platform-type">Platform Type *</Label>
              <Input
                id="platform-type"
                placeholder="onlyfans"
                value={platformType}
                onChange={(e) => setPlatformType(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="platform-handle">Handle/Username</Label>
              <Input
                id="platform-handle"
                placeholder="@username"
                value={platformHandle}
                onChange={(e) => setPlatformHandle(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="platform-url">Profile URL</Label>
              <Input
                id="platform-url"
                placeholder="https://..."
                value={platformUrl}
                onChange={(e) => setPlatformUrl(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="platform-bio">Bio/Description</Label>
              <Textarea
                id="platform-bio"
                placeholder="Your profile bio..."
                value={platformBio}
                onChange={(e) => setPlatformBio(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlatformDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreatePlatform} disabled={createPlatformMutation.isPending}>
              {createPlatformMutation.isPending ? "Adding..." : "Add Platform"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

