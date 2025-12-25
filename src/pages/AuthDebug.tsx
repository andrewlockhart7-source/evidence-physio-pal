import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { RefreshCw, Trash2, Home } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const AuthDebug = () => {
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const [localStorageKeys, setLocalStorageKeys] = useState<string[]>([]);
  const [recheckData, setRecheckData] = useState<any>(null);

  const loadLocalStorageKeys = () => {
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.includes('supabase')) {
        keys.push(key);
      }
    }
    setLocalStorageKeys(keys);
  };

  const handleRecheck = async () => {
    const { data, error } = await supabase.auth.getSession();
    setRecheckData({ data, error, timestamp: new Date().toISOString() });
    loadLocalStorageKeys();
    toast({
      title: "Session Re-checked",
      description: data.session ? "Valid session found" : "No session found",
    });
  };

  const handleClearAndSignOut = async () => {
    await supabase.auth.signOut();
    localStorage.clear();
    toast({
      title: "Cleared",
      description: "Signed out and cleared localStorage",
    });
    setTimeout(() => navigate("/auth"), 500);
  };

  return (
    <div className="min-h-screen p-8 bg-background">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Auth Session Debug</h1>
          <Button variant="outline" onClick={() => navigate("/")}>
            <Home className="mr-2 h-4 w-4" />
            Home
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Current User</CardTitle>
            <CardDescription>From useAuth hook</CardDescription>
          </CardHeader>
          <CardContent>
            {user ? (
              <div className="space-y-2 font-mono text-sm">
                <div><strong>ID:</strong> {user.id}</div>
                <div><strong>Email:</strong> {user.email}</div>
                <div><strong>Created:</strong> {user.created_at}</div>
              </div>
            ) : (
              <p className="text-muted-foreground">No user found</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Current Session</CardTitle>
            <CardDescription>From useAuth hook</CardDescription>
          </CardHeader>
          <CardContent>
            {session ? (
              <div className="space-y-2 font-mono text-sm">
                <div><strong>Access Token:</strong> {session.access_token.substring(0, 20)}...</div>
                <div><strong>Expires At:</strong> {new Date(session.expires_at! * 1000).toLocaleString()}</div>
                <div><strong>User ID:</strong> {session.user.id}</div>
              </div>
            ) : (
              <p className="text-muted-foreground">No session found</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
            <CardDescription>Debug and troubleshooting tools</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={handleRecheck} className="w-full" variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Re-check Session
            </Button>
            <Button onClick={handleClearAndSignOut} className="w-full" variant="destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Sign Out & Clear localStorage
            </Button>
          </CardContent>
        </Card>

        {recheckData && (
          <Card>
            <CardHeader>
              <CardTitle>Last Re-check Result</CardTitle>
              <CardDescription>At {recheckData.timestamp}</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded text-xs overflow-auto">
                {JSON.stringify(recheckData, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}

        {localStorageKeys.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Supabase localStorage Keys</CardTitle>
              <CardDescription>Keys containing 'supabase'</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1 font-mono text-sm">
                {localStorageKeys.map((key) => (
                  <li key={key} className="text-muted-foreground">• {key}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AuthDebug;
