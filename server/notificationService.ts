import { getDb } from "./db";
import { notifications, notificationPreferences } from "../drizzle/schema";
import { eq, and, desc } from "drizzle-orm";
import webpush from "web-push";

// VAPID keys for web push (should be in environment variables in production)
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@contentvault.app";

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    VAPID_SUBJECT,
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
}

export type NotificationType = "content_approved" | "content_uploaded" | "revenue_milestone" | "import_complete" | "upload_failed" | "system";

interface CreateNotificationParams {
  userId: number;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
}

/**
 * Create a notification for a user
 */
export async function createNotification(params: CreateNotificationParams) {
  const db = await getDb();
  if (!db) {
    console.warn("[Notifications] Database not available");
    return null;
  }

  try {
    const [notification] = await db.insert(notifications).values({
      userId: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      actionUrl: params.actionUrl,
      metadata: params.metadata ? JSON.stringify(params.metadata) : null,
      isRead: 0,
    }).$returningId();

    // Check user preferences and send push/email if enabled
    await sendNotificationIfEnabled(params.userId, params.type, params.title, params.message, params.actionUrl);

    return notification;
  } catch (error) {
    console.error("[Notifications] Failed to create notification:", error);
    return null;
  }
}

/**
 * Send push notification if user has it enabled
 */
async function sendNotificationIfEnabled(
  userId: number,
  type: NotificationType,
  title: string,
  message: string,
  actionUrl?: string
) {
  const db = await getDb();
  if (!db) return;

  try {
    const [prefs] = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId))
      .limit(1);

    if (!prefs) return;

    // Check if this notification type is enabled
    const typeEnabled = getTypePreference(prefs, type);
    if (!typeEnabled) return;

    // Send push notification if enabled and subscription exists
    if (prefs.pushEnabled && prefs.pushSubscription) {
      try {
        const subscription = JSON.parse(prefs.pushSubscription);
        await webpush.sendNotification(
          subscription,
          JSON.stringify({
            title,
            body: message,
            icon: "/icon-192.png",
            badge: "/icon-192.png",
            data: {
              url: actionUrl || "/",
            },
          })
        );
      } catch (error) {
        console.error("[Notifications] Failed to send push notification:", error);
      }
    }

    // TODO: Send email if enabled
    // if (prefs.emailEnabled && user.email) {
    //   await sendEmail(user.email, title, message);
    // }
  } catch (error) {
    console.error("[Notifications] Failed to check preferences:", error);
  }
}

function getTypePreference(prefs: any, type: NotificationType): boolean {
  const mapping: Record<NotificationType, string> = {
    content_approved: "contentApproved",
    content_uploaded: "contentUploaded",
    revenue_milestone: "revenueMilestone",
    import_complete: "importComplete",
    upload_failed: "uploadFailed",
    system: "contentApproved", // Default to true for system notifications
  };
  
  const prefKey = mapping[type];
  return prefs[prefKey] === 1;
}

/**
 * Get notifications for a user
 */
export async function getUserNotifications(userId: number, limit: number = 50, unreadOnly: boolean = false) {
  const db = await getDb();
  if (!db) return [];

  try {
    const conditions = [eq(notifications.userId, userId)];
    if (unreadOnly) {
      conditions.push(eq(notifications.isRead, 0));
    }

    const result = await db
      .select()
      .from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);

    return result;
  } catch (error) {
    console.error("[Notifications] Failed to get notifications:", error);
    return [];
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationAsRead(notificationId: number, userId: number) {
  const db = await getDb();
  if (!db) return false;

  try {
    await db
      .update(notifications)
      .set({ isRead: 1 })
      .where(
        and(
          eq(notifications.id, notificationId),
          eq(notifications.userId, userId)
        )
      );
    return true;
  } catch (error) {
    console.error("[Notifications] Failed to mark as read:", error);
    return false;
  }
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsAsRead(userId: number) {
  const db = await getDb();
  if (!db) return false;

  try {
    await db
      .update(notifications)
      .set({ isRead: 1 })
      .where(eq(notifications.userId, userId));
    return true;
  } catch (error) {
    console.error("[Notifications] Failed to mark all as read:", error);
    return false;
  }
}

/**
 * Get unread notification count
 */
export async function getUnreadCount(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  try {
    const result = await db
      .select()
      .from(notifications)
      .where(
        and(
          eq(notifications.userId, userId),
          eq(notifications.isRead, 0)
        )
      );
    return result.length;
  } catch (error) {
    console.error("[Notifications] Failed to get unread count:", error);
    return 0;
  }
}

/**
 * Get or create user notification preferences
 */
export async function getUserPreferences(userId: number) {
  const db = await getDb();
  if (!db) return null;

  try {
    const [prefs] = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId))
      .limit(1);

    if (prefs) return prefs;

    // Create default preferences
    await db
      .insert(notificationPreferences)
      .values({ userId });

    // Fetch the newly created preferences
    const [newPrefs] = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId))
      .limit(1);

    return newPrefs || null;
  } catch (error) {
    console.error("[Notifications] Failed to get preferences:", error);
    return null;
  }
}

/**
 * Update user notification preferences
 */
export async function updateUserPreferences(userId: number, preferences: Partial<typeof notificationPreferences.$inferInsert>) {
  const db = await getDb();
  if (!db) return false;

  try {
    await db
      .update(notificationPreferences)
      .set(preferences)
      .where(eq(notificationPreferences.userId, userId));
    return true;
  } catch (error) {
    console.error("[Notifications] Failed to update preferences:", error);
    return false;
  }
}

export const VAPID_PUBLIC_KEY_EXPORT = VAPID_PUBLIC_KEY;
