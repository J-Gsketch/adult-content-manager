import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  useSidebar,
} from "@/components/ui/sidebar";
import { APP_LOGO, APP_TITLE, getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import {
  LayoutDashboard, LogOut, PanelLeft, Images, FolderTree, Tags,
  Upload, DollarSign, Settings, Download, Package, CreditCard, Receipt, Bell
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from './DashboardLayoutSkeleton';
import { Button } from "./ui/button";
import NotificationCenter from "./NotificationCenter";
import MobileBottomNav from "./MobileBottomNav";
import MobileTopBar from "./MobileTopBar";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: Images, label: "Media Library", path: "/media-library" },
  { icon: Download, label: "Import Jobs", path: "/import-jobs" },
  { icon: FolderTree, label: "Categories", path: "/categories" },
  { icon: Tags, label: "Tags", path: "/tags" },
  { icon: Upload, label: "Upload Queue", path: "/upload-queue" },
  { icon: Package, label: "Upload Prep", path: "/upload-preparation" },
  { icon: DollarSign, label: "Revenue", path: "/revenue" },
  { icon: Bell, label: "Notifications", path: "/notifications" },
  { icon: Settings, label: "Settings", path: "/settings" },
  { icon: CreditCard, label: "Pricing", path: "/pricing" },
  { icon: Receipt, label: "Billing", path: "/billing" },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 280;
const MIN_WIDTH = 200;
const MAX_WIDTH = 480;

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();
  const isMobile = useIsMobile();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) return <DashboardLayoutSkeleton />;

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-6">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-3xl blur-xl" />
              <img
                src={APP_LOGO}
                alt={APP_TITLE}
                className="relative h-24 w-24 rounded-3xl object-cover shadow-2xl ring-2 ring-primary/20"
              />
            </div>
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold tracking-tight">{APP_TITLE}</h1>
              <p className="text-sm text-muted-foreground">
                Sign in to manage your content
              </p>
            </div>
          </div>
          <Button
            onClick={() => { window.location.href = getLoginUrl(); }}
            size="lg"
            className="w-full h-14 rounded-2xl text-base font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all active:scale-95"
          >
            Sign in with Google
          </Button>
        </div>
      </div>
    );
  }

  // Mobile layout: top bar + content + bottom nav
  if (isMobile) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <MobileTopBar />
        {/* Content area with safe area padding */}
        <main
          className="flex-1 overflow-y-auto overscroll-y-contain"
          style={{
            paddingTop: "56px",       // top bar height
            paddingBottom: "72px",    // bottom nav height
            WebkitOverflowScrolling: "touch" as any,
          }}
        >
          <div className="px-4 py-4">
            {children}
          </div>
        </main>
        <MobileBottomNav />
      </div>
    );
  }

  // Desktop layout: sidebar
  return (
    <SidebarProvider
      style={{ "--sidebar-width": `${sidebarWidth}px` } as CSSProperties}
    >
      <DesktopLayout setSidebarWidth={setSidebarWidth}>
        {children}
      </DesktopLayout>
    </SidebarProvider>
  );
}

function DesktopLayout({
  children,
  setSidebarWidth,
}: {
  children: React.ReactNode;
  setSidebarWidth: (w: number) => void;
}) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isCollapsed) setIsResizing(false);
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const sidebarLeft = sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) setSidebarWidth(newWidth);
    };
    const handleMouseUp = () => setIsResizing(false);
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar collapsible="icon" className="border-r-0" disableTransition={isResizing}>
          <SidebarHeader className="h-16 justify-center">
            <div className="flex items-center gap-3 pl-2 group-data-[collapsible=icon]:px-0 transition-all w-full">
              {isCollapsed ? (
                <div className="relative h-8 w-8 shrink-0 group">
                  <img src={APP_LOGO} className="h-8 w-8 rounded-md object-cover ring-1 ring-border" alt="Logo" />
                  <button
                    onClick={toggleSidebar}
                    className="absolute inset-0 flex items-center justify-center bg-accent rounded-md ring-1 ring-border opacity-0 group-hover:opacity-100 transition-opacity focus:outline-none"
                  >
                    <PanelLeft className="h-4 w-4 text-foreground" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 min-w-0">
                    <img src={APP_LOGO} className="h-8 w-8 rounded-md object-cover ring-1 ring-border shrink-0" alt="Logo" />
                    <span className="font-semibold tracking-tight truncate">{APP_TITLE}</span>
                  </div>
                  <button
                    onClick={toggleSidebar}
                    className="ml-auto h-8 w-8 flex items-center justify-center hover:bg-accent rounded-lg transition-colors focus:outline-none shrink-0"
                  >
                    <PanelLeft className="h-4 w-4 text-muted-foreground" />
                  </button>
                </>
              )}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0">
            <SidebarMenu className="px-2 py-1">
              {menuItems.map(item => {
                const isActive = location === item.path;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.path)}
                      tooltip={item.label}
                      className="h-10 transition-all font-normal"
                    >
                      <item.icon className={`h-4 w-4 ${isActive ? "text-primary" : ""}`} />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-accent/50 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none">
                  <Avatar className="h-9 w-9 border shrink-0">
                    <AvatarFallback className="text-xs font-medium">
                      {user?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium truncate leading-none">{user?.name || "-"}</p>
                    <p className="text-xs text-muted-foreground truncate mt-1.5">{user?.email || "-"}</p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={logout} className="cursor-pointer text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => { if (!isCollapsed) setIsResizing(true); }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        {/* Desktop top bar */}
        <div className="flex border-b h-14 items-center justify-between bg-background/95 px-4 backdrop-blur sticky top-0 z-40">
          <span className="font-semibold text-sm text-muted-foreground">
            {menuItems.find(i => i.path === location)?.label ?? APP_TITLE}
          </span>
          <NotificationCenter />
        </div>
        <main className="flex-1 p-4">{children}</main>
      </SidebarInset>
    </>
  );
}
