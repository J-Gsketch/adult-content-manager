import { APP_LOGO, APP_TITLE } from "@/const";
import { useLocation } from "wouter";
import NotificationCenter from "./NotificationCenter";
import { ChevronLeft } from "lucide-react";

const routeTitles: Record<string, string> = {
  "/": "Dashboard",
  "/media-library": "Media Library",
  "/import-jobs": "Import Jobs",
  "/categories": "Categories",
  "/tags": "Tags",
  "/upload-queue": "Upload Queue",
  "/upload-preparation": "Upload Prep",
  "/revenue": "Revenue",
  "/settings": "Settings",
  "/pricing": "Pricing",
  "/billing": "Billing",
  "/notifications": "Notifications",
};

export default function MobileTopBar() {
  const [location, setLocation] = useLocation();
  const title = routeTitles[location] ?? APP_TITLE;
  const isHome = location === "/";

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-b border-border safe-area-top">
      <div className="flex items-center h-14 px-4 gap-3">
        {/* Back button or Logo */}
        {!isHome ? (
          <button
            onClick={() => setLocation("/")}
            className="flex items-center justify-center h-9 w-9 rounded-xl hover:bg-accent active:scale-95 transition-all duration-150"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        ) : (
          <img
            src={APP_LOGO}
            alt={APP_TITLE}
            className="h-8 w-8 rounded-xl object-cover ring-1 ring-border"
          />
        )}

        {/* Title */}
        <h1 className="flex-1 text-base font-semibold tracking-tight truncate">
          {isHome ? APP_TITLE : title}
        </h1>

        {/* Notification center */}
        <NotificationCenter />
      </div>
    </header>
  );
}
