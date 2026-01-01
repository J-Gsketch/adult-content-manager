/**
 * Stripe Products and Pricing Configuration
 * Define all subscription plans and one-time products here
 */

export const SUBSCRIPTION_PLANS = {
  BASIC: {
    name: "Basic Plan",
    priceId: process.env.STRIPE_PRICE_BASIC || "price_basic",
    price: 9.99,
    interval: "month" as const,
    features: [
      "Up to 100 media items",
      "AI-powered categorization",
      "2 platform connections",
      "Basic analytics",
      "Email support",
    ],
  },
  PRO: {
    name: "Pro Plan",
    priceId: process.env.STRIPE_PRICE_PRO || "price_pro",
    price: 29.99,
    interval: "month" as const,
    features: [
      "Up to 1,000 media items",
      "Advanced AI categorization",
      "Unlimited platform connections",
      "Advanced analytics & reporting",
      "Priority email support",
      "Bulk upload & import",
      "Custom categories & tags",
    ],
  },
  PREMIUM: {
    name: "Premium Plan",
    priceId: process.env.STRIPE_PRICE_PREMIUM || "price_premium",
    price: 99.99,
    interval: "month" as const,
    features: [
      "Unlimited media items",
      "Advanced AI with custom models",
      "Unlimited platform connections",
      "Real-time analytics dashboard",
      "24/7 priority support",
      "Automated upload scheduling",
      "Revenue optimization tools",
      "API access",
      "White-label options",
    ],
  },
} as const;

export type SubscriptionPlanKey = keyof typeof SUBSCRIPTION_PLANS;

/**
 * Get plan details by key
 */
export function getPlanByKey(key: SubscriptionPlanKey) {
  return SUBSCRIPTION_PLANS[key];
}

/**
 * Get plan key by Stripe price ID
 */
export function getPlanKeyByPriceId(priceId: string): SubscriptionPlanKey | null {
  for (const [key, plan] of Object.entries(SUBSCRIPTION_PLANS)) {
    if (plan.priceId === priceId) {
      return key as SubscriptionPlanKey;
    }
  }
  return null;
}

/**
 * Check if a feature is available for a given plan
 */
export function hasFeature(planKey: SubscriptionPlanKey | null, feature: string): boolean {
  if (!planKey) return false;
  const plan = SUBSCRIPTION_PLANS[planKey];
  return plan.features.some((f) => f.toLowerCase().includes(feature.toLowerCase()));
}

/**
 * Get media item limit for a plan
 */
export function getMediaLimit(planKey: SubscriptionPlanKey | null): number {
  if (!planKey) return 10; // Free tier
  switch (planKey) {
    case "BASIC":
      return 100;
    case "PRO":
      return 1000;
    case "PREMIUM":
      return Infinity;
    default:
      return 10;
  }
}

/**
 * Get platform connection limit for a plan
 */
export function getPlatformLimit(planKey: SubscriptionPlanKey | null): number {
  if (!planKey) return 1; // Free tier
  switch (planKey) {
    case "BASIC":
      return 2;
    case "PRO":
    case "PREMIUM":
      return Infinity;
    default:
      return 1;
  }
}
