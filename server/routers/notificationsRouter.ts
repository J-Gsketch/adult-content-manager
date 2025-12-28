import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  createNotification,
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadCount,
  getUserPreferences,
  updateUserPreferences,
  VAPID_PUBLIC_KEY_EXPORT,
} from "../notificationService";

export const notificationsRouter = router({
  /**
   * Get user notifications
   */
  list: protectedProcedure
    .input(
      z.object({
        limit: z.number().optional().default(50),
        unreadOnly: z.boolean().optional().default(false),
      })
    )
    .query(async ({ ctx, input }) => {
      return await getUserNotifications(ctx.user.id, input.limit, input.unreadOnly);
    }),

  /**
   * Get unread notification count
   */
  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    return await getUnreadCount(ctx.user.id);
  }),

  /**
   * Mark notification as read
   */
  markAsRead: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      return await markNotificationAsRead(input.id, ctx.user.id);
    }),

  /**
   * Mark all notifications as read
   */
  markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
    return await markAllNotificationsAsRead(ctx.user.id);
  }),

  /**
   * Get user notification preferences
   */
  getPreferences: protectedProcedure.query(async ({ ctx }) => {
    return await getUserPreferences(ctx.user.id);
  }),

  /**
   * Update user notification preferences
   */
  updatePreferences: protectedProcedure
    .input(
      z.object({
        pushEnabled: z.number().optional(),
        emailEnabled: z.number().optional(),
        contentApproved: z.number().optional(),
        contentUploaded: z.number().optional(),
        revenueMilestone: z.number().optional(),
        importComplete: z.number().optional(),
        uploadFailed: z.number().optional(),
        pushSubscription: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await updateUserPreferences(ctx.user.id, input);
    }),

  /**
   * Get VAPID public key for push subscription
   */
  getVapidPublicKey: protectedProcedure.query(() => {
    return { publicKey: VAPID_PUBLIC_KEY_EXPORT };
  }),

  /**
   * Test notification (for development)
   */
  test: protectedProcedure
    .input(
      z.object({
        title: z.string(),
        message: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await createNotification({
        userId: ctx.user.id,
        type: "system",
        title: input.title,
        message: input.message,
      });
    }),
});
