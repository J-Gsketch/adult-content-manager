import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useState } from "react";

const PLANS = [
  {
    key: "BASIC" as const,
    name: "Basic Plan",
    price: "$9.99",
    interval: "month",
    description: "Perfect for getting started",
    features: [
      "Up to 100 media items",
      "AI-powered categorization",
      "2 platform connections",
      "Basic analytics",
      "Email support",
    ],
    popular: false,
  },
  {
    key: "PRO" as const,
    name: "Pro Plan",
    price: "$29.99",
    interval: "month",
    description: "For serious content creators",
    features: [
      "Up to 1,000 media items",
      "Advanced AI categorization",
      "Unlimited platform connections",
      "Advanced analytics & reporting",
      "Priority email support",
      "Bulk upload & import",
      "Custom categories & tags",
    ],
    popular: true,
  },
  {
    key: "PREMIUM" as const,
    name: "Premium Plan",
    price: "$99.99",
    interval: "month",
    description: "Maximum power and features",
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
    popular: false,
  },
];

export default function Pricing() {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const { data: subscription } = trpc.stripe.getSubscriptionStatus.useQuery();
  const createCheckout = trpc.stripe.createCheckoutSession.useMutation();

  const handleSubscribe = async (planKey: "BASIC" | "PRO" | "PREMIUM") => {
    setLoadingPlan(planKey);
    try {
      const { url } = await createCheckout.mutateAsync({ planKey });
      
      if (url) {
        toast.info("Redirecting to checkout...");
        window.open(url, "_blank");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to create checkout session");
    } finally {
      setLoadingPlan(null);
    }
  };

  const isCurrentPlan = (planKey: string) => {
    return subscription?.subscriptionPlan === planKey && 
           subscription?.subscriptionStatus === "active";
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-foreground mb-4">
          Choose Your Plan
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
          Select the perfect plan for your content management needs. Upgrade or downgrade anytime.
        </p>
      </div>

      {subscription?.subscriptionStatus === "active" && (
        <Card className="p-6 bg-primary/5 border-primary/20">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-foreground">Current Plan</h3>
              <p className="text-muted-foreground">
                You're currently subscribed to the {subscription.subscriptionPlan} plan
              </p>
            </div>
            <Button variant="outline" onClick={() => window.location.href = "/billing"}>
              Manage Subscription
            </Button>
          </div>
        </Card>
      )}

      <div className="grid md:grid-cols-3 gap-8">
        {PLANS.map((plan) => (
          <Card
            key={plan.key}
            className={`p-8 relative ${
              plan.popular
                ? "ring-2 ring-primary shadow-lg scale-105"
                : ""
            }`}
          >
            {plan.popular && (
              <Badge className="absolute top-4 right-4" variant="default">
                Most Popular
              </Badge>
            )}

            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-foreground mb-2">
                  {plan.name}
                </h3>
                <p className="text-muted-foreground text-sm">
                  {plan.description}
                </p>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-foreground">
                  {plan.price}
                </span>
                <span className="text-muted-foreground">/{plan.interval}</span>
              </div>

              <ul className="space-y-3">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <span className="text-sm text-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                className="w-full"
                variant={plan.popular ? "default" : "outline"}
                onClick={() => handleSubscribe(plan.key)}
                disabled={loadingPlan === plan.key || isCurrentPlan(plan.key)}
              >
                {loadingPlan === plan.key ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : isCurrentPlan(plan.key) ? (
                  "Current Plan"
                ) : (
                  "Subscribe Now"
                )}
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-8 bg-muted/50">
        <div className="text-center space-y-4">
          <h3 className="text-xl font-semibold text-foreground">
            All plans include
          </h3>
          <div className="grid md:grid-cols-3 gap-6 text-sm text-muted-foreground">
            <div>✓ Secure cloud storage</div>
            <div>✓ Automatic backups</div>
            <div>✓ Mobile app access</div>
            <div>✓ 99.9% uptime SLA</div>
            <div>✓ GDPR compliant</div>
            <div>✓ Cancel anytime</div>
          </div>
        </div>
      </Card>

      <div className="text-center text-sm text-muted-foreground">
        <p>
          Need a custom plan for your business?{" "}
          <a href="mailto:support@contentvault.com" className="text-primary hover:underline">
            Contact us
          </a>
        </p>
      </div>
    </div>
  );
}
