import { useLocation } from "wouter";
import { LayoutDashboard, Images, Upload, DollarSign, MoreHorizontal } from "lucide-react";
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/_core/hooks/useAuth";
import { Download, FolderTree, Tags, Package, Settings, CreditCard, Receipt, Bell } from "lucide-react";
import NotificationCenter from "./NotificationCenter";

// Primary nav items shown in bottom bar
const primaryNav = [
  { icon: LayoutDashboard, label: "Home", path: "/" },
  { icon: Images, label: "Library", path: "/media-library" },
  { icon: Upload, label: "Queue", path: "/upload-queue" },
  { icon: DollarSign, label: "Revenue", path: "/revenue" },
];

// Secondary nav items shown in "More" sheet
const secondaryNav = [
  { icon: Download, label: "Import Jobs", path: "/import-jobs" },
  { icon: FolderTree, label: "Categories", path: "/categories" },
  { icon: Tags, label: "Tags", path: "/tags" },
  { icon: Package, label: "Upload Prep", path: "/upload-preparation" },
  { icon: Bell, label: "Notifications", path: "/notifications" },
  { icon: CreditCard, label: "Pricing", path: "/pricing" },
  { icon: Receipt, label: "Billing", path: "/billing" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

export default function MobileBottomNav() {
  const [location, setLocation] = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const { user, logout } = useAuth();

  const navigate = (path: string) => {
    setLocation(path);
    setMoreOpen(false);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around px-2 py-1 pb-safe">
        {primaryNav.map((item) => {
          const isActive = location === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl min-w-[60px] transition-all duration-200 active:scale-95 ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            >
              <div className={`relative p-1.5 rounded-xl transition-all duration-200 ${
                isActive ? "bg-primary/15" : ""
              }`}>
                <item.icon className={`h-5 w-5 transition-all duration-200 ${isActive ? "scale-110" : ""}`} />
                {isActive && (
                  <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                )}
              </div>
              <span className={`text-[10px] font-medium transition-all duration-200 ${
                isActive ? "text-primary" : "text-muted-foreground"
              }`}>
                {item.label}
              </span>
            </button>
          );
        })}

        {/* More Sheet */}
        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetTrigger asChild>
            <button
              className={`flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl min-w-[60px] transition-all duration-200 active:scale-95 ${
                moreOpen ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <div className={`p-1.5 rounded-xl transition-all duration-200 ${moreOpen ? "bg-primary/15" : ""}`}>
                <MoreHorizontal className="h-5 w-5" />
              </div>
              <span className="text-[10px] font-medium">More</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-3xl pb-safe max-h-[85vh]">
            <SheetHeader className="pb-2">
              <SheetTitle className="text-left text-base">Menu</SheetTitle>
            </SheetHeader>

            {/* User profile */}
            <div className="flex items-center gap-3 p-3 mb-3 rounded-2xl bg-muted/50">
              <Avatar className="h-10 w-10 border-2 border-primary/20">
                <AvatarFallback className="text-sm font-semibold bg-primary/10 text-primary">
                  {user?.name?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{user?.name || "User"}</p>
                <p className="text-xs text-muted-foreground truncate">{user?.email || ""}</p>
              </div>
            </div>

            {/* Secondary nav grid */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              {secondaryNav.map((item) => {
                const isActive = location === item.path;
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all duration-200 active:scale-95 ${
                      isActive
                        ? "bg-primary/15 text-primary"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="text-[10px] font-medium text-center leading-tight">{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Sign out */}
            <button
              onClick={() => { logout(); setMoreOpen(false); }}
              className="w-full flex items-center justify-center gap-2 p-3 rounded-2xl text-destructive bg-destructive/10 hover:bg-destructive/20 transition-all active:scale-95 text-sm font-medium"
            >
              Sign out
            </button>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
