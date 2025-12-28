import { Bell, Check, CheckCheck, Settings as SettingsIcon, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export default function Notifications() {
  const [, navigate] = useLocation();
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const utils = trpc.useUtils();

  const { data: notifications, isLoading } = trpc.notifications.list.useQuery({
    limit: 100,
    unreadOnly: showUnreadOnly,
  });

  const { data: preferences } = trpc.notifications.getPreferences.useQuery();

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
      toast.success("All notifications marked as read");
    },
  });

  const updatePreferencesMutation = trpc.notifications.updatePreferences.useMutation({
    onSuccess: () => {
      utils.notifications.getPreferences.invalidate();
      toast.success("Notification preferences updated");
    },
  });

  const handleNotificationClick = (notification: any) => {
    if (notification.isRead === 0) {
      markAsReadMutation.mutate({ id: notification.id });
    }
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
    }
  };

  const getNotificationIcon = (type: string) => {
    const iconClass = "h-5 w-5";
    switch (type) {
      case "content_approved":
        return <Check className={iconClass} />;
      case "content_uploaded":
        return <CheckCheck className={iconClass} />;
      case "revenue_milestone":
        return <span className="text-xl">💰</span>;
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
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "content_uploaded":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "revenue_milestone":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "import_complete":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "upload_failed":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      default:
        return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
  };

  const handlePreferenceChange = (key: string, value: number) => {
    updatePreferencesMutation.mutate({ [key]: value });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Notifications</h1>
          <p className="text-muted-foreground mt-1">
            Stay updated on your content and revenue
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">
                <SettingsIcon className="h-4 w-4 mr-2" />
                Preferences
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Notification Preferences</DialogTitle>
                <DialogDescription>
                  Choose which notifications you want to receive
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6 pt-4">
                <div className="space-y-4">
                  <h3 className="font-medium">Notification Channels</h3>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="push-enabled">Push Notifications</Label>
                    <Switch
                      id="push-enabled"
                      checked={preferences?.pushEnabled === 1}
                      onCheckedChange={(checked) =>
                        handlePreferenceChange("pushEnabled", checked ? 1 : 0)
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="email-enabled">Email Notifications</Label>
                    <Switch
                      id="email-enabled"
                      checked={preferences?.emailEnabled === 1}
                      onCheckedChange={(checked) =>
                        handlePreferenceChange("emailEnabled", checked ? 1 : 0)
                      }
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-medium">Notification Types</h3>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="content-approved">Content Approved</Label>
                    <Switch
                      id="content-approved"
                      checked={preferences?.contentApproved === 1}
                      onCheckedChange={(checked) =>
                        handlePreferenceChange("contentApproved", checked ? 1 : 0)
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="content-uploaded">Content Uploaded</Label>
                    <Switch
                      id="content-uploaded"
                      checked={preferences?.contentUploaded === 1 || false}
                      onCheckedChange={(checked) =>
                        handlePreferenceChange("contentUploaded", checked ? 1 : 0)
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="revenue-milestone">Revenue Milestones</Label>
                    <Switch
                      id="revenue-milestone"
                      checked={preferences?.revenueMilestone === 1 || false}
                      onCheckedChange={(checked) =>
                        handlePreferenceChange("revenueMilestone", checked ? 1 : 0)
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="import-complete">Import Complete</Label>
                    <Switch
                      id="import-complete"
                      checked={preferences?.importComplete === 1 || false}
                      onCheckedChange={(checked) =>
                        handlePreferenceChange("importComplete", checked ? 1 : 0)
                      }
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="upload-failed">Upload Failed</Label>
                    <Switch
                      id="upload-failed"
                      checked={preferences?.uploadFailed === 1 || false}
                      onCheckedChange={(checked) =>
                        handlePreferenceChange("uploadFailed", checked ? 1 : 0)
                      }
                    />
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {notifications && notifications.some((n) => n.isRead === 0) && (
            <Button
              variant="outline"
              onClick={() => markAllAsReadMutation.mutate()}
              disabled={markAllAsReadMutation.isPending}
            >
              <CheckCheck className="h-4 w-4 mr-2" />
              Mark all read
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Switch
          id="unread-only"
          checked={showUnreadOnly}
          onCheckedChange={setShowUnreadOnly}
        />
        <Label htmlFor="unread-only" className="cursor-pointer">
          Show unread only
        </Label>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Card key={i} className="p-6 animate-pulse">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-1/4" />
                  <div className="h-3 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-1/6" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : notifications && notifications.length > 0 ? (
        <div className="space-y-3">
          {notifications.map((notification) => (
            <Card
              key={notification.id}
              className={`p-6 cursor-pointer transition-all hover:shadow-md ${
                notification.isRead === 0 ? "ring-2 ring-primary/20" : ""
              }`}
              onClick={() => handleNotificationClick(notification)}
            >
              <div className="flex items-start gap-4">
                <div
                  className={`p-3 rounded-full border ${getNotificationColor(
                    notification.type
                  )}`}
                >
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">
                        {notification.title}
                      </h3>
                      {notification.isRead === 0 && (
                        <Badge variant="default" className="text-xs">
                          New
                        </Badge>
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatDistanceToNow(new Date(notification.createdAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                  <p className="text-muted-foreground">{notification.message}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center text-center">
            <Bell className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {showUnreadOnly ? "No unread notifications" : "No notifications yet"}
            </h3>
            <p className="text-muted-foreground max-w-md">
              {showUnreadOnly
                ? "You're all caught up! Check back later for new updates."
                : "You'll see notifications here when there are updates about your content, uploads, or revenue."}
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
