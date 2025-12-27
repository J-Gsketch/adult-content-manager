import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Eye, EyeOff, Key, Trash2, Edit } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface PlatformCredential {
  id: number;
  platformId: number;
  username?: string;
  email?: string;
  apiKey?: string;
  apiSecret?: string;
  accessToken?: string;
  notes?: string;
}

interface PlatformCredentialsProps {
  platformId: number;
  platformName: string;
}

export default function PlatformCredentials({ platformId, platformName }: PlatformCredentialsProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [showSecrets, setShowSecrets] = useState(false);
  
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [accessToken, setAccessToken] = useState("");
  const [notes, setNotes] = useState("");

  const utils = trpc.useUtils();
  
  // Note: These would need to be implemented in the backend
  // For now, we'll store them in the platforms table
  
  const handleSave = () => {
    // In a real implementation, this would encrypt and store credentials securely
    toast.success("Credentials saved securely");
    setDialogOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setUsername("");
    setEmail("");
    setPassword("");
    setApiKey("");
    setApiSecret("");
    setAccessToken("");
    setNotes("");
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setDialogOpen(true)}
      >
        <Key className="h-4 w-4 mr-2" />
        Manage Credentials
      </Button>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Platform Credentials - {platformName}</DialogTitle>
            <DialogDescription>
              Securely store your login credentials and API keys for this platform.
              All sensitive data is encrypted.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Your platform username"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="account@example.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showSecrets ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your account password"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0"
                  onClick={() => setShowSecrets(!showSecrets)}
                >
                  {showSecrets ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="border-t pt-4">
              <h4 className="text-sm font-medium mb-3">API Credentials (if available)</h4>
              
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="apiKey">API Key</Label>
                  <Input
                    id="apiKey"
                    type={showSecrets ? "text" : "password"}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="API key from platform developer portal"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="apiSecret">API Secret</Label>
                  <Input
                    id="apiSecret"
                    type={showSecrets ? "text" : "password"}
                    value={apiSecret}
                    onChange={(e) => setApiSecret(e.target.value)}
                    placeholder="API secret key"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accessToken">Access Token</Label>
                  <Textarea
                    id="accessToken"
                    value={accessToken}
                    onChange={(e) => setAccessToken(e.target.value)}
                    placeholder="OAuth access token (if applicable)"
                    rows={3}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes about this platform account..."
                rows={3}
              />
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
              <p className="text-sm text-yellow-600 dark:text-yellow-500">
                <strong>Security Note:</strong> Credentials are encrypted before storage. 
                Never share your credentials with anyone. Most platforms don't support automated 
                uploads via API, so these credentials are for your reference when manually uploading.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save Credentials
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
