import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useActivityTracking } from "@/hooks/useActivityTracking";
import { useAuth } from "@/hooks/useAuth";
import { 
  Brain, 
  Database, 
  FileCheck, 
  Loader2, 
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  BookOpen
} from "lucide-react";

interface GenerationResults {
  totalConditions: number;
  processedConditions: number;
  generatedProtocols: number;
  errors: string[];
}

export const ProtocolGenerator = () => {
  const { user } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<GenerationResults | null>(null);
  const [currentCondition, setCurrentCondition] = useState<string>("");
  const { toast } = useToast();
  const { trackProtocolCreated } = useActivityTracking();


  const generateAllProtocols = async () => {
    setIsGenerating(true);
    setProgress(0);
    setResults(null);
    setCurrentCondition("Preparing...");

    try {
      // 1) Get total number of conditions to compute progress
      const { count, error: countError } = await supabase
        .from('conditions')
        .select('*', { count: 'exact', head: true });

      if (countError) {
        throw new Error(`Failed to count conditions: ${countError.message}`);
      }

      const total = Number(count ?? 0);
      if (total === 0) {
        setProgress(100);
        setResults({ totalConditions: 0, processedConditions: 0, generatedProtocols: 0, errors: [] });
        toast({ title: "No Conditions Found", description: "There are no conditions to process." });
        return;
      }

      const BATCH_SIZE = 5; // keep requests fast to avoid timeouts
      let processedTotal = 0;
      let generatedTotal = 0;
      const allErrors: string[] = [];

      const totalBatches = Math.ceil(total / BATCH_SIZE);

      for (let offset = 0, batchIndex = 0; offset < total; offset += BATCH_SIZE, batchIndex++) {
        setCurrentCondition(`Batch ${batchIndex + 1} of ${totalBatches}`);

        // Retry logic for network issues
        let retryCount = 0;
        const maxRetries = 3;
        let success = false;

        while (!success && retryCount < maxRetries) {
          try {
            const { data, error } = await supabase.functions.invoke('generate-condition-protocols', {
              body: { offset, limit: BATCH_SIZE }
            });

            if (error) {
              throw new Error(`Edge function failed: ${error.message || JSON.stringify(error)}`);
            }
            if (data?.error) {
              throw new Error(data.error);
            }

            const raw = (data as any)?.results ?? {};
            const processed = Number(raw?.processedConditions ?? 0);
            const generated = Number(raw?.generatedProtocols ?? 0);
            const errors = Array.isArray(raw?.errors) ? raw.errors : [];

            processedTotal += processed;
            generatedTotal += generated;
            allErrors.push(...errors);

            // Update progress based on total processed
            setProgress(Math.min(99, Math.round((processedTotal / total) * 100)));
            success = true;
          } catch (err: any) {
            retryCount++;
            if (retryCount >= maxRetries) {
              throw err;
            }
            // Wait before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
          }
        }
      }

      const finalResults: GenerationResults = {
        totalConditions: total,
        processedConditions: processedTotal,
        generatedProtocols: generatedTotal,
        errors: allErrors,
      };

      setResults(finalResults);
      setProgress(100);
      setCurrentCondition("Completed");

      if (user && generatedTotal > 0) {
        for (let i = 0; i < generatedTotal; i++) {
          await trackProtocolCreated();
        }
      }

      if (allErrors.length === 0) {
        toast({
          title: "Protocol Generation Complete",
          description: `Successfully generated ${generatedTotal} evidence-based protocols`,
        });
      } else {
        toast({
          title: "Protocol Generation Finished with Errors",
          description: `Generated ${generatedTotal}. ${allErrors.length} condition(s) had errors.`,
          variant: "destructive",
        });
      }

    } catch (error: any) {
      console.error('Protocol generation error:', error);
      setCurrentCondition("Failed");

      let errorMessage = "Failed to generate protocols";
      const msg = String(error?.message ?? "");
      if (msg.includes("429")) {
        errorMessage = "Rate limit reached. Please wait a moment and try again.";
      } else if (msg.includes("402")) {
        errorMessage = "Payment required for Lovable AI usage. Please add credits to your workspace.";
      } else if (msg.includes("Failed to send a request") || msg.toLowerCase().includes("network")) {
        errorMessage = "Network error or timeout. We now run in small batches — please try again.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      toast({
        title: "Generation Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };


  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" />
            AI-Powered Protocol Generation
          </CardTitle>
          <CardDescription>
            Generate comprehensive, evidence-based treatment protocols for all conditions using the latest research from PubMed, Cochrane, and PEDro databases.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-4 border rounded-lg">
              <Database className="h-8 w-8 text-blue-500" />
              <div>
                <h4 className="font-semibold">Multiple Evidence Sources</h4>
                <p className="text-sm text-muted-foreground">PubMed, Cochrane, PEDro</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 border rounded-lg">
              <Brain className="h-8 w-8 text-purple-500" />
              <div>
                <h4 className="font-semibold">AI Synthesis</h4>
                <p className="text-sm text-muted-foreground">GPT-4 powered analysis</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 border rounded-lg">
              <FileCheck className="h-8 w-8 text-green-500" />
              <div>
                <h4 className="font-semibold">Evidence-Based</h4>
                <p className="text-sm text-muted-foreground">Clinically validated protocols</p>
              </div>
            </div>
          </div>

          {isGenerating && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm font-medium">Processing: {currentCondition}</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}

          {results && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5 text-blue-500" />
                      <div>
                        <p className="text-2xl font-bold">{results.totalConditions}</p>
                        <p className="text-sm text-muted-foreground">Total Conditions</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      <div>
                        <p className="text-2xl font-bold">{results.generatedProtocols}</p>
                        <p className="text-sm text-muted-foreground">Protocols Generated</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-5 w-5 text-orange-500" />
                      <div>
                        <p className="text-2xl font-bold">{results.errors?.length ?? 0}</p>
                        <p className="text-sm text-muted-foreground">Errors</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {(results.errors?.length ?? 0) > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-orange-600">Generation Errors</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {results.errors!.map((error, index) => (
                        <Badge key={index} variant="outline" className="text-orange-600">
                          {error}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          <div className="flex gap-4">
            <Button 
              onClick={generateAllProtocols}
              disabled={isGenerating}
              size="lg"
              className="flex-1"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating Protocols...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Generate All Evidence-Based Protocols
                </>
              )}
            </Button>
          </div>

          <div className="text-sm text-muted-foreground space-y-2">
            <p><strong>What this does:</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>Searches PubMed, Cochrane, and PEDro for latest evidence on each condition</li>
              <li>Uses AI to synthesize research into comprehensive treatment protocols</li>
              <li>Generates phase-based protocols with specific interventions and outcomes</li>
              <li>Includes contraindications, precautions, and discharge criteria</li>
              <li>Links protocols to supporting evidence for validation</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};