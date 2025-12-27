import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Image as ImageIcon } from "lucide-react";
import {
  initGooglePhotosAuth,
  fetchGooglePhotos,
  downloadGooglePhoto,
  isGooglePhotosConnected,
  extractAccessToken,
  getAccessToken,
  type GooglePhoto,
} from "@/lib/googlePhotos";
import { toast } from "sonner";

interface GooglePhotosPickerProps {
  onPhotosSelected: (files: File[]) => void;
  trigger?: React.ReactNode;
}

export default function GooglePhotosPicker({ onPhotosSelected, trigger }: GooglePhotosPickerProps) {
  const [open, setOpen] = useState(false);
  const [photos, setPhotos] = useState<GooglePhoto[]>([]);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>();

  useEffect(() => {
    // Check for OAuth redirect
    const token = extractAccessToken();
    if (token) {
      setConnected(true);
      loadPhotos(token);
    } else {
      setConnected(isGooglePhotosConnected());
    }
  }, []);

  const handleConnect = () => {
    const config = {
      clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
      redirectUri: window.location.origin + window.location.pathname,
    };

    if (!config.clientId) {
      toast.error('Google Photos integration not configured. Please add VITE_GOOGLE_CLIENT_ID to environment variables.');
      return;
    }

    initGooglePhotosAuth(config);
  };

  const loadPhotos = async (token?: string) => {
    setLoading(true);
    try {
      const accessToken = token || getAccessToken();
      if (!accessToken) {
        throw new Error('Not authenticated');
      }

      const result = await fetchGooglePhotos(accessToken, 50, nextPageToken);
      setPhotos(prev => [...prev, ...result.photos]);
      setNextPageToken(result.nextPageToken);
      setConnected(true);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load photos');
      setConnected(false);
    } finally {
      setLoading(false);
    }
  };

  const togglePhoto = (photoId: string) => {
    const newSelected = new Set(selectedPhotos);
    if (newSelected.has(photoId)) {
      newSelected.delete(photoId);
    } else {
      newSelected.add(photoId);
    }
    setSelectedPhotos(newSelected);
  };

  const handleImport = async () => {
    if (selectedPhotos.size === 0) {
      toast.error('Please select at least one photo');
      return;
    }

    setImporting(true);
    try {
      const selectedPhotoObjects = photos.filter(p => selectedPhotos.has(p.id));
      const files: File[] = [];

      for (const photo of selectedPhotoObjects) {
        try {
          const blob = await downloadGooglePhoto(photo);
          const file = new File([blob], photo.filename, { type: photo.mimeType });
          files.push(file);
        } catch (error) {
          console.error(`Failed to download photo ${photo.id}:`, error);
        }
      }

      if (files.length > 0) {
        onPhotosSelected(files);
        toast.success(`Imported ${files.length} photo(s) from Google Photos`);
        setOpen(false);
        setSelectedPhotos(new Set());
      } else {
        toast.error('Failed to import photos');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to import photos');
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            <ImageIcon className="h-4 w-4 mr-2" />
            Import from Google Photos
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Import from Google Photos</DialogTitle>
        </DialogHeader>

        {!connected ? (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <ImageIcon className="h-16 w-16 text-muted-foreground" />
            <p className="text-muted-foreground text-center">
              Connect your Google Photos account to import photos
            </p>
            <Button onClick={handleConnect}>
              Connect Google Photos
            </Button>
          </div>
        ) : (
          <>
            <ScrollArea className="h-[500px] pr-4">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {photos.map((photo) => (
                  <div
                    key={photo.id}
                    className="relative aspect-square rounded-lg overflow-hidden border-2 cursor-pointer hover:border-primary transition-colors"
                    style={{
                      borderColor: selectedPhotos.has(photo.id) ? 'hsl(var(--primary))' : 'transparent',
                    }}
                    onClick={() => togglePhoto(photo.id)}
                  >
                    <img
                      src={`${photo.baseUrl}=w400-h400-c`}
                      alt={photo.filename}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute top-2 right-2">
                      <Checkbox
                        checked={selectedPhotos.has(photo.id)}
                        onCheckedChange={() => togglePhoto(photo.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {loading && (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              )}

              {!loading && nextPageToken && (
                <div className="flex justify-center py-4">
                  <Button variant="outline" onClick={() => loadPhotos()}>
                    Load More
                  </Button>
                </div>
              )}
            </ScrollArea>

            <div className="flex justify-between items-center pt-4 border-t">
              <p className="text-sm text-muted-foreground">
                {selectedPhotos.size} photo(s) selected
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleImport} disabled={importing || selectedPhotos.size === 0}>
                  {importing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Import Selected
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
