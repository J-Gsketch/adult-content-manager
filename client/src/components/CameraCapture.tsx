import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Camera, X, RotateCw, Check } from "lucide-react";
import { toast } from "sonner";

interface CameraCaptureProps {
  onCapture: (file: File) => void;
  trigger?: React.ReactNode;
}

export default function CameraCapture({ onCapture, trigger }: CameraCaptureProps) {
  const [open, setOpen] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (open) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [open, facingMode]);

  const startCamera = async () => {
    try {
      // Stop existing stream
      stopCamera();

      // Request camera access
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });

      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error: any) {
      console.error("Camera access error:", error);
      toast.error("Failed to access camera. Please grant camera permissions.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Get image data
    const imageDataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setCapturedImage(imageDataUrl);
  };

  const retakePhoto = () => {
    setCapturedImage(null);
  };

  const confirmCapture = () => {
    if (!capturedImage) return;

    // Convert data URL to File
    fetch(capturedImage)
      .then((res) => res.blob())
      .then((blob) => {
        const timestamp = Date.now();
        const file = new File([blob], `camera-${timestamp}.jpg`, { type: "image/jpeg" });
        onCapture(file);
        toast.success("Photo captured successfully");
        setOpen(false);
        setCapturedImage(null);
      })
      .catch((error) => {
        console.error("Failed to process captured image:", error);
        toast.error("Failed to process captured image");
      });
  };

  const toggleCamera = () => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
    setCapturedImage(null);
  };

  const handleClose = () => {
    setOpen(false);
    setCapturedImage(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline">
            <Camera className="h-4 w-4 mr-2" />
            Take Photo
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle>Camera Capture</DialogTitle>
        </DialogHeader>

        <div className="relative bg-black">
          {!capturedImage ? (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-auto max-h-[60vh] object-contain"
              />
              <canvas ref={canvasRef} className="hidden" />
              
              <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
                <div className="flex justify-center items-center gap-4">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-12 w-12 rounded-full"
                    onClick={toggleCamera}
                  >
                    <RotateCw className="h-5 w-5" />
                  </Button>
                  
                  <Button
                    size="icon"
                    className="h-16 w-16 rounded-full bg-white hover:bg-white/90"
                    onClick={capturePhoto}
                  >
                    <div className="h-14 w-14 rounded-full border-4 border-black" />
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-12 w-12 rounded-full"
                    onClick={handleClose}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <>
              <img
                src={capturedImage}
                alt="Captured"
                className="w-full h-auto max-h-[60vh] object-contain"
              />
              
              <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
                <div className="flex justify-center items-center gap-4">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={retakePhoto}
                  >
                    <X className="h-5 w-5 mr-2" />
                    Retake
                  </Button>
                  
                  <Button
                    size="lg"
                    onClick={confirmCapture}
                  >
                    <Check className="h-5 w-5 mr-2" />
                    Use Photo
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
