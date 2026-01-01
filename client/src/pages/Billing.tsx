import { CreditCard, Download, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useState } from "react";

export default function Billing() {
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const { data: subscription, isLoading: subLoading } = trpc.stripe.getSubscriptionStatus.useQuery();
  const { data: invoices, isLoading: invoicesLoading } = trpc.stripe.getBillingHistory.useQuery();
  const createPortal = trpc.stripe.createPortalSession.useMutation();
  const cancelSubscription = trpc.stripe.cancelSubscription.useMutation();

  const handleManageBilling = async () => {
    try {
      const { url } = await createPortal.mutateAsync();
      if (url) {
        toast.info("Redirecting to billing portal...");
        window.open(url, "_blank");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to open billing portal");
    }
  };

  const handleCancelSubscription = async () => {
    try {
      await cancelSubscription.mutateAsync();
      toast.success("Subscription will be canceled at the end of the billing period");
      setCancelDialogOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to cancel subscription");
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="default">Active</Badge>;
      case "trialing":
        return <Badge variant="secondary">Trial</Badge>;
      case "past_due":
        return <Badge variant="destructive">Past Due</Badge>;
      case "canceled":
        return <Badge variant="outline">Canceled</Badge>;
      default:
        return <Badge variant="outline">None</Badge>;
    }
  };

  if (subLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Billing & Subscription</h1>
        <p className="text-muted-foreground mt-1">
          Manage your subscription and view billing history
        </p>
      </div>

      {/* Current Subscription */}
      <Card className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-4 flex-1">
            <div>
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Current Subscription
              </h2>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-bold text-foreground">
                  {subscription?.subscriptionPlan || "Free Plan"}
                </span>
                {getStatusBadge(subscription?.subscriptionStatus || "none")}
              </div>
            </div>

            {subscription?.subscriptionStatus === "active" && (
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>Your subscription is active and will renew automatically.</p>
                {subscription.stripeCustomerId && (
                  <p>Customer ID: {subscription.stripeCustomerId}</p>
                )}
              </div>
            )}

            {subscription?.subscriptionStatus === "none" && (
              <div className="space-y-2">
                <p className="text-muted-foreground">
                  You're currently on the free plan with limited features.
                </p>
                <Button onClick={() => window.location.href = "/pricing"}>
                  Upgrade Now
                </Button>
              </div>
            )}
          </div>

          {subscription?.subscriptionStatus === "active" && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleManageBilling}
                disabled={createPortal.isPending}
              >
                {createPortal.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Manage Billing
                  </>
                )}
              </Button>

              <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">Cancel Subscription</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Cancel Subscription</DialogTitle>
                    <DialogDescription>
                      Are you sure you want to cancel your subscription? You'll continue to have
                      access until the end of your billing period.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setCancelDialogOpen(false)}
                    >
                      Keep Subscription
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleCancelSubscription}
                      disabled={cancelSubscription.isPending}
                    >
                      {cancelSubscription.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Cancel Subscription"
                      )}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>
      </Card>

      {/* Billing History */}
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-4">
          Billing History
        </h2>

        {invoicesLoading ? (
          <Card className="p-12">
            <div className="flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          </Card>
        ) : invoices && invoices.length > 0 ? (
          <Card>
            <div className="divide-y">
              {invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="p-6 flex items-center justify-between hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-medium text-foreground">
                        {invoice.currency} {invoice.amount.toFixed(2)}
                      </span>
                      <Badge
                        variant={
                          invoice.status === "paid"
                            ? "default"
                            : invoice.status === "open"
                            ? "secondary"
                            : "destructive"
                        }
                      >
                        {invoice.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatDistanceToNow(invoice.created, { addSuffix: true })}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    {invoice.invoicePdf && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(invoice.invoicePdf!, "_blank")}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        PDF
                      </Button>
                    )}
                    {invoice.hostedInvoiceUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(invoice.hostedInvoiceUrl!, "_blank")}
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ) : (
          <Card className="p-12">
            <div className="text-center">
              <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No billing history
              </h3>
              <p className="text-muted-foreground">
                Your invoices and receipts will appear here once you subscribe to a plan.
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
