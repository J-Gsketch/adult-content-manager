import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { stripe } from "../stripe/client";
import { SUBSCRIPTION_PLANS } from "../stripe/products";
import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export const stripeRouter = router({
  /**
   * Create a checkout session for subscription
   */
  createCheckoutSession: protectedProcedure
    .input(
      z.object({
        planKey: z.enum(["BASIC", "PRO", "PREMIUM"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const plan = SUBSCRIPTION_PLANS[input.planKey];
      const origin = ctx.req.headers.origin || "http://localhost:3000";

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [
          {
            price: plan.priceId,
            quantity: 1,
          },
        ],
        customer_email: ctx.user.email || undefined,
        client_reference_id: ctx.user.id.toString(),
        metadata: {
          user_id: ctx.user.id.toString(),
          customer_email: ctx.user.email || "",
          customer_name: ctx.user.name || "",
          plan_key: input.planKey,
        },
        success_url: `${origin}/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/pricing?canceled=true`,
        allow_promotion_codes: true,
      });

      return {
        url: session.url,
        sessionId: session.id,
      };
    }),

  /**
   * Get current user's subscription status
   */
  getSubscriptionStatus: protectedProcedure.query(async ({ ctx }) => {
    return {
      subscriptionStatus: ctx.user.subscriptionStatus || "none",
      subscriptionPlan: ctx.user.subscriptionPlan,
      stripeCustomerId: ctx.user.stripeCustomerId,
      stripeSubscriptionId: ctx.user.stripeSubscriptionId,
    };
  }),

  /**
   * Create customer portal session for managing subscription
   */
  createPortalSession: protectedProcedure.mutation(async ({ ctx }) => {
    if (!ctx.user.stripeCustomerId) {
      throw new Error("No Stripe customer ID found");
    }

    const origin = ctx.req.headers.origin || "http://localhost:3000";

    const session = await stripe.billingPortal.sessions.create({
      customer: ctx.user.stripeCustomerId,
      return_url: `${origin}/billing`,
    });

    return {
      url: session.url,
    };
  }),

  /**
   * Cancel subscription
   */
  cancelSubscription: protectedProcedure.mutation(async ({ ctx }) => {
    if (!ctx.user.stripeSubscriptionId) {
      throw new Error("No active subscription found");
    }

    const subscription = await stripe.subscriptions.update(
      ctx.user.stripeSubscriptionId,
      {
        cancel_at_period_end: true,
      }
    );

    return {
      success: true,
      cancelAt: subscription.cancel_at,
    };
  }),

  /**
   * Get billing history (invoices)
   */
  getBillingHistory: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user.stripeCustomerId) {
      return [];
    }

    const invoices = await stripe.invoices.list({
      customer: ctx.user.stripeCustomerId,
      limit: 20,
    });

    return invoices.data.map((invoice) => ({
      id: invoice.id,
      amount: invoice.amount_paid / 100,
      currency: invoice.currency.toUpperCase(),
      status: invoice.status,
      created: new Date(invoice.created * 1000),
      invoicePdf: invoice.invoice_pdf,
      hostedInvoiceUrl: invoice.hosted_invoice_url,
    }));
  }),
});
