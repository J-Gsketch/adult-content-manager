import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Plus, DollarSign, TrendingUp, Calendar } from "lucide-react";
import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function Revenue() {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [platformId, setPlatformId] = useState<number | null>(null);
  const [amount, setAmount] = useState("");
  const [transactionType, setTransactionType] = useState<"sale" | "subscription" | "tip" | "other">("sale");
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState("");

  const utils = trpc.useUtils();
  const { data: revenueList } = trpc.revenue.list.useQuery({});
  const { data: totalRevenue } = trpc.revenue.total.useQuery({});
  const { data: platforms } = trpc.platforms.list.useQuery();

  const createMutation = trpc.revenue.create.useMutation({
    onSuccess: () => {
      toast.success("Revenue record added");
      utils.revenue.list.invalidate();
      utils.revenue.total.invalidate();
      setAddDialogOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to add revenue");
    },
  });

  const resetForm = () => {
    setPlatformId(null);
    setAmount("");
    setTransactionType("sale");
    setTransactionDate(new Date().toISOString().split('T')[0]);
    setNotes("");
  };

  const handleCreate = () => {
    if (!platformId || !amount) {
      toast.error("Please fill in required fields");
      return;
    }

    createMutation.mutate({
      platformId,
      amount: Math.round(parseFloat(amount) * 100),
      transactionType,
      transactionDate: new Date(transactionDate),
      notes: notes || undefined,
    });
  };

  // Calculate stats
  const revenueByPlatform = platforms?.map(platform => {
    const platformRevenue = revenueList?.filter(r => r.platformId === platform.id) || [];
    const total = platformRevenue.reduce((sum, r) => sum + r.amount, 0);
    return {
      platform: platform.name,
      total,
      count: platformRevenue.length,
    };
  }).filter(p => p.total > 0);

  const recentRevenue = revenueList?.slice(0, 10) || [];

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Revenue</h1>
            <p className="text-muted-foreground mt-1">
              Track your earnings across platforms
            </p>
          </div>
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Revenue
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(totalRevenue || 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                All time earnings
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Transactions</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {revenueList?.length || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Total transactions
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Platforms</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {revenueByPlatform?.length || 0}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Earning platforms
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Revenue by Platform */}
        {revenueByPlatform && revenueByPlatform.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Revenue by Platform</CardTitle>
              <CardDescription>
                Earnings breakdown across your platforms
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {revenueByPlatform.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div>
                      <p className="font-medium text-foreground">{item.platform}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.count} transaction{item.count !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <p className="text-lg font-bold text-foreground">
                      {formatCurrency(item.total)}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Transactions */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>
              Your latest revenue entries
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentRevenue.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Platform</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentRevenue.map((item) => {
                      const platform = platforms?.find(p => p.id === item.platformId);
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">
                            {formatDate(item.transactionDate)}
                          </TableCell>
                          <TableCell>{platform?.name || "Unknown"}</TableCell>
                          <TableCell className="capitalize">{item.transactionType}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {item.notes || "-"}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(item.amount)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">
                No revenue recorded yet. Add your first transaction to start tracking.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Revenue Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Revenue</DialogTitle>
            <DialogDescription>
              Record a new revenue transaction
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="platform">Platform *</Label>
              <Select value={platformId?.toString()} onValueChange={(v) => setPlatformId(parseInt(v))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select platform..." />
                </SelectTrigger>
                <SelectContent>
                  {platforms?.map((platform) => (
                    <SelectItem key={platform.id} value={platform.id.toString()}>
                      {platform.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="amount">Amount (USD) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="99.99"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="type">Transaction Type</Label>
              <Select value={transactionType} onValueChange={(v: any) => setTransactionType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sale">Sale</SelectItem>
                  <SelectItem value="subscription">Subscription</SelectItem>
                  <SelectItem value="tip">Tip</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="date">Transaction Date</Label>
              <Input
                id="date"
                type="date"
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Additional details..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Adding..." : "Add Revenue"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}

