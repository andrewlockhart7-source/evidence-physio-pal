import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useActivityTracking } from "@/hooks/useActivityTracking";
import { 
  Loader2, 
  Search, 
  Database, 
  BookOpen, 
  FileText, 
  Stethoscope,
  RefreshCw,
  CheckCircle,
  AlertCircle
} from "lucide-react";

interface SyncResult {
  source: string;
  success: boolean;
  message: string;
  count: number;
}

export const EvidenceIntegration = () => {
  const [searchTerms, setSearchTerms] = useState("low back pain");
  const [loading, setLoading] = useState(false);
  const [syncResults, setSyncResults] = useState<SyncResult[]>([]);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const { toast } = useToast();
  const { trackEvidenceView } = useActivityTracking();

  const sources = [
    {
      id: 'pubmed',
      name: 'PubMed',
      description: 'Latest research articles from NCBI',
      icon: Database,
      color: 'bg-blue-500'
    },
    {
      id: 'cochrane',
      name: 'Cochrane Library',
      description: 'Systematic reviews and meta-analyses',
      icon: BookOpen,
      color: 'bg-green-500'
    },
    {
      id: 'pedro',
      name: 'PEDro Database',
      description: 'Physiotherapy-specific evidence',
      icon: Stethoscope,
      color: 'bg-purple-500'
    },
    {
      id: 'guidelines',
      name: 'Clinical Guidelines',
      description: 'Professional association guidelines',
      icon: FileText,
      color: 'bg-orange-500'
    }
  ];

  const handleSingleSourceSync = async (sourceId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke(`${sourceId}-integration`, {
        body: {
          searchTerms,
          maxResults: 10
        }
      });

      if (error) throw error;

      // Track evidence search
      await trackEvidenceView(undefined, searchTerms);

      toast({
        title: "Sync Successful",
        description: `${data.message}`,
      });

      // Update results
      const newResult = {
        source: sourceId,
        success: true,
        message: data.message,
        count: data.articles?.length || data.reviews?.length || data.studies?.length || data.guidelines?.length || 0
      };

      setSyncResults(prev => {
        const filtered = prev.filter(r => r.source !== sourceId);
        return [...filtered, newResult];
      });

    } catch (error: any) {
      console.error(`Error syncing ${sourceId}:`, error);
      toast({
        title: "Sync Failed",
        description: error.message || `Failed to sync ${sourceId}`,
        variant: "destructive",
      });

      setSyncResults(prev => {
        const filtered = prev.filter(r => r.source !== sourceId);
        return [...filtered, {
          source: sourceId,
          success: false,
          message: error.message || 'Sync failed',
          count: 0
        }];
      });
    }
    setLoading(false);
  };

  const handleFullSync = async () => {
    setLoading(true);
    setSyncResults([]);
    
    try {
      const { data, error } = await supabase.functions.invoke('evidence-sync', {
        body: {
          searchTerms,
          sources: sources.map(s => s.id),
          maxResults: 40
        }
      });

      if (error) throw error;

      toast({
        title: "Full Sync Completed",
        description: `${data.message}`,
      });

      setSyncResults(data.sources_processed || []);
      setLastSync(new Date().toISOString());

    } catch (error: any) {
      console.error('Error in full sync:', error);
      toast({
        title: "Sync Failed",
        description: error.message || 'Full sync failed',
        variant: "destructive",
      });
    }
    setLoading(false);
  };

  const handleTestEvidenceRetrieval = async () => {
    try {
      const { data, error } = await supabase
        .from('evidence')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;

      toast({
        title: "Evidence Retrieved",
        description: `Found ${data.length} recent evidence entries`,
      });

      console.log('Recent evidence:', data);
    } catch (error: any) {
      toast({
        title: "Retrieval Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Evidence Integration System
          </CardTitle>
          <CardDescription>
            Automatically sync latest evidence from multiple medical databases
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="search-terms">Search Terms</Label>
            <Input
              id="search-terms"
              value={searchTerms}
              onChange={(e) => setSearchTerms(e.target.value)}
              placeholder="e.g., low back pain, stroke rehabilitation, COPD"
            />
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={handleFullSync} 
              disabled={loading}
              className="flex-1"
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <RefreshCw className="mr-2 h-4 w-4" />
              Full Sync All Sources
            </Button>
            <Button 
              onClick={handleTestEvidenceRetrieval}
              variant="outline"
            >
              <Search className="mr-2 h-4 w-4" />
              Test Retrieval
            </Button>
          </div>

          {lastSync && (
            <div className="text-sm text-muted-foreground">
              Last sync: {new Date(lastSync).toLocaleString()}
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="sources" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="sources">Individual Sources</TabsTrigger>
          <TabsTrigger value="results">Sync Results</TabsTrigger>
        </TabsList>

        <TabsContent value="sources" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sources.map((source) => {
              const Icon = source.icon;
              const result = syncResults.find(r => r.source === source.id);
              
              return (
                <Card key={source.id}>
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-md ${source.color}`}>
                        <Icon className="h-4 w-4 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{source.name}</CardTitle>
                        <CardDescription className="text-sm">
                          {source.description}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button
                      onClick={() => handleSingleSourceSync(source.id)}
                      disabled={loading}
                      variant="outline"
                      className="w-full"
                    >
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Sync {source.name}
                    </Button>
                    
                    {result && (
                      <div className="flex items-center gap-2">
                        {result.success ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        )}
                        <span className="text-sm">
                          {result.success ? `Added ${result.count} items` : 'Sync failed'}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          {syncResults.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground">
                  No sync results yet. Run a sync to see results here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {syncResults.map((result, index) => (
                <Card key={index}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {result.success ? (
                          <CheckCircle className="h-5 w-5 text-green-500" />
                        ) : (
                          <AlertCircle className="h-5 w-5 text-red-500" />
                        )}
                        <div>
                          <h4 className="font-medium capitalize">{result.source}</h4>
                          <p className="text-sm text-muted-foreground">{result.message}</p>
                        </div>
                      </div>
                      {result.success && (
                        <Badge variant="secondary">
                          {result.count} items
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};