import { useState, useEffect } from "react";
import { Bell, Check, CheckCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";

export default function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  const { data: notifications, refetch } = trpc.notifications.list.useQuery(
    { limit: 20, unreadOnly: false },
    { enabled: open }
  );

  const { data: unreadCountData } = trpc.notifications.unreadCount.useQuery(undefined, {
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const markAsReadMutation = trpc.notifications.markAsRead.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
      utils.notifications.unreadCount.invalidate();
    },
  });

  const markAllAsReadMutation = trpc.notifications.markAllAsRead.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
      utils.notifications.unreadCount.invalidate();
    },
  });

  const unreadCount = unreadCountData || 0;

  const handleNotificationClick = (notification: any) => {
    if (notification.isRead === 0) {
      markAsReadMutation.mutate({ id: notification.id });
    }
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
      setOpen(false);
    }
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  const getNotificationIcon = (type: string) => {
    const iconClass = "h-4 w-4";
    switch (type) {
      case "content_approved":
        return <Check className={iconClass} />;
      case "content_uploaded":
        return <CheckCheck className={iconClass} />;
      case "revenue_milestone":
        return <span className={iconClass}>💰</span>;
      case "import_complete":
        return <CheckCheck className={iconClass} />;
      case "upload_failed":
        return <X className={iconClass} />;
      default:
        return <Bell className={iconClass} />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "content_approved":
        return "bg-green-500/10 text-green-500";
      case "content_uploaded":
        return "bg-blue-500/10 text-blue-500";
      case "revenue_milestone":
        return "bg-yellow-500/10 text-yellow-500";
      case "import_complete":
        return "bg-green-500/10 text-green-500";
      case "upload_failed":
        return "bg-red-500/10 text-red-500";
      default:
        return "bg-gray-500/10 text-gray-500";
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-semibold text-foreground">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllAsRead}
              disabled={markAllAsReadMutation.isPending}
            >
              <CheckCheck className="h-4 w-4 mr-2" />
              Mark all read
            </Button>
          )}
        </div>

        <ScrollArea className="h-[400px]">
          {notifications && notifications.length > 0 ? (
            <div className="divide-y divide-border">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 cursor-pointer transition-colors hover:bg-accent/50 ${
                    notification.isRead === 0 ? "bg-accent/20" : ""
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2 rounded-full ${getNotificationColor(
                        notification.type
                      )}`}
                    >
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-sm text-foreground">
                          {notification.title}
                        </p>
                        {notification.isRead === 0 && (
                          <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {formatDistanceToNow(new Date(notification.createdAt), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-12">
              <Bell className="h-12 w-12 text-muted-foreground mb-3" />
              <p className="text-muted-foreground text-center">
                No notifications yet
              </p>
            </div>
          )}
        </ScrollArea>

        <div className="p-3 border-t border-border">
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => {
              navigate("/notifications");
              setOpen(false);
            }}
          >
            View all notifications
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
