import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Download, FileText, Image as ImageIcon, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function UploadPreparation() {
  const [selectedMedia, setSelectedMedia] = useState<number[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState<string>("");
  const [customTitle, setCustomTitle] = useState("");
  const [customDescription, setCustomDescription] = useState("");
  const [customTags, setCustomTags] = useState("");

  const { data: approvedMedia } = trpc.media.list.useQuery({
    isApproved: true,
    limit: 100,
  });

  const { data: platforms } = trpc.platforms.list.useQuery();

  const toggleMediaSelection = (id: number) => {
    setSelectedMedia(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (approvedMedia) {
      setSelectedMedia(approvedMedia.map(m => m.id));
    }
  };

  const deselectAll = () => {
    setSelectedMedia([]);
  };

  const getPlatformTemplate = (platformType: string) => {
    const templates: Record<string, { titleFormat: string; descFormat: string; tagTips: string }> = {
      pornhub: {
        titleFormat: "[Category] - Descriptive Title",
        descFormat: "Engaging description with keywords. Include performer info if applicable.",
        tagTips: "Use 10-20 relevant tags. Mix broad and specific terms."
      },
      onlyfans: {
        titleFormat: "Catchy, teasing title",
        descFormat: "Personal, engaging message to fans. Create anticipation.",
        tagTips: "Use hashtags: #exclusive #content #subscribe"
      },
      manyvids: {
        titleFormat: "SEO-friendly descriptive title",
        descFormat: "Detailed description with what viewers can expect. Include duration.",
        tagTips: "Use ManyVids categories and specific fetish tags"
      },
      clips4sale: {
        titleFormat: "Fetish/Category - Specific Description",
        descFormat: "Detailed scenario description. Be specific about content.",
        tagTips: "Focus on specific fetishes and niches"
      },
    };

    return templates[platformType] || {
      titleFormat: "Descriptive title",
      descFormat: "Engaging description",
      tagTips: "Relevant tags"
    };
  };

  const generateExportPackage = async () => {
    if (selectedMedia.length === 0) {
      toast.error("Please select at least one media item");
      return;
    }

    if (!selectedPlatform) {
      toast.error("Please select a target platform");
      return;
    }

    // Generate export package
    const exportData = {
      platform: selectedPlatform,
      mediaItems: selectedMedia,
      metadata: {
        title: customTitle,
        description: customDescription,
        tags: customTags.split(',').map(t => t.trim()).filter(Boolean),
      },
      exportDate: new Date().toISOString(),
    };

    // Create downloadable JSON file
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `upload-package-${selectedPlatform}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success(`Export package created for ${selectedMedia.length} item(s)`);
  };

  const generateUploadChecklist = () => {
    if (selectedMedia.length === 0 || !selectedPlatform) {
      toast.error("Please select media and platform");
      return;
    }

    const platform = platforms?.find(p => p.id.toString() === selectedPlatform);
    
    const checklist = `
UPLOAD CHECKLIST - ${platform?.name || 'Platform'}
Generated: ${new Date().toLocaleString()}

Selected Media: ${selectedMedia.length} item(s)

PRE-UPLOAD CHECKLIST:
☐ Verify all content meets platform guidelines
☐ Check video/image quality and resolution
☐ Ensure proper age verification documents are on file
☐ Review content for prohibited material
☐ Prepare thumbnail images (if required)

METADATA PREPARATION:
Title: ${customTitle || '[Add title]'}
Description: ${customDescription || '[Add description]'}
Tags: ${customTags || '[Add tags]'}

UPLOAD STEPS:
☐ Log into ${platform?.name || 'platform'} account
☐ Navigate to upload section
☐ Select prepared media files
☐ Copy/paste title and description
☐ Add tags
☐ Set pricing (if applicable)
☐ Choose visibility settings
☐ Add to collections/playlists
☐ Review preview
☐ Submit for review/publish

POST-UPLOAD:
☐ Verify upload completed successfully
☐ Check that metadata displays correctly
☐ Share link on social media
☐ Track performance metrics
☐ Mark as uploaded in Adult Content Manager

NOTES:
- Platform: ${platform?.type || 'N/A'}
- Handle: ${platform?.handle || 'N/A'}
- Profile URL: ${platform?.profileUrl || 'N/A'}
`;

    const blob = new Blob([checklist], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `upload-checklist-${selectedPlatform}-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success("Upload checklist generated");
  };

  const selectedPlatformData = platforms?.find(p => p.id.toString() === selectedPlatform);
  const template = selectedPlatformData ? getPlatformTemplate(selectedPlatformData.type) : null;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Upload Preparation</h1>
          <p className="text-muted-foreground mt-1">
            Prepare content for manual upload to monetization platforms
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Media Selection */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Select Content</CardTitle>
                  <CardDescription>
                    Choose approved media to prepare for upload
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={selectAll}>
                    Select All
                  </Button>
                  <Button variant="outline" size="sm" onClick={deselectAll}>
                    Clear
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {approvedMedia && approvedMedia.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {approvedMedia.map((media) => (
                    <div
                      key={media.id}
                      className={`relative aspect-square rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
                        selectedMedia.includes(media.id)
                          ? 'border-primary ring-2 ring-primary/50'
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => toggleMediaSelection(media.id)}
                    >
                      <img
                        src={media.thumbnailUrl || media.storageUrl}
                        alt={media.filename || 'Media'}
                        className="w-full h-full object-cover"
                      />
                      {selectedMedia.includes(media.id) && (
                        <div className="absolute top-2 right-2 bg-primary rounded-full p-1">
                          <CheckCircle2 className="h-5 w-5 text-primary-foreground" />
                        </div>
                      )}
                      {media.isExplicit && (
                        <Badge className="absolute bottom-2 left-2" variant="destructive">
                          Explicit
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground">
                    No approved content available. Approve content in Media Library first.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Platform & Metadata */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Target Platform</CardTitle>
                <CardDescription>
                  Select where you'll upload this content
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Platform</Label>
                  <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select platform" />
                    </SelectTrigger>
                    <SelectContent>
                      {platforms?.map((platform) => (
                        <SelectItem key={platform.id} value={platform.id.toString()}>
                          {platform.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedPlatformData && (
                  <div className="text-sm space-y-1">
                    <p className="text-muted-foreground">
                      <strong>Type:</strong> {selectedPlatformData.type}
                    </p>
                    {selectedPlatformData.handle && (
                      <p className="text-muted-foreground">
                        <strong>Handle:</strong> @{selectedPlatformData.handle}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Selected Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-4">
                  <p className="text-3xl font-bold text-primary">{selectedMedia.length}</p>
                  <p className="text-sm text-muted-foreground">media items selected</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Metadata Customization */}
        {template && (
          <Card>
            <CardHeader>
              <CardTitle>Optimize Metadata</CardTitle>
              <CardDescription>
                Customize title, description, and tags for {selectedPlatformData?.name}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  placeholder={template.titleFormat}
                />
                <p className="text-xs text-muted-foreground">
                  Format: {template.titleFormat}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  placeholder={template.descFormat}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  Tip: {template.descFormat}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags">Tags (comma-separated)</Label>
                <Textarea
                  id="tags"
                  value={customTags}
                  onChange={(e) => setCustomTags(e.target.value)}
                  placeholder="tag1, tag2, tag3"
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  {template.tagTips}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Export Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Export & Generate</CardTitle>
            <CardDescription>
              Create export packages and upload checklists
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button onClick={generateExportPackage} disabled={selectedMedia.length === 0 || !selectedPlatform}>
                <Download className="h-4 w-4 mr-2" />
                Generate Export Package
              </Button>
              <Button variant="outline" onClick={generateUploadChecklist} disabled={selectedMedia.length === 0 || !selectedPlatform}>
                <FileText className="h-4 w-4 mr-2" />
                Generate Upload Checklist
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
