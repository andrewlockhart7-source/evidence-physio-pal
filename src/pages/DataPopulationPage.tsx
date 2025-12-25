import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Database, CheckCircle, Loader2, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";

export const DataPopulationPage = () => {
  const [isPopulating, setIsPopulating] = useState(false);
  const [isPopulatingRheum, setIsPopulatingRheum] = useState(false);
  const [completed, setCompleted] = useState<string[]>([]);
  const [currentTask, setCurrentTask] = useState<string>("");
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();
  const navigate = useNavigate();

  const populateDatabase = async () => {
    setIsPopulating(true);
    setCompleted([]);
    setProgress(0);

    try {
      setCurrentTask("Populating conditions and core data...");
      setProgress(25);
      
      const { data, error: conditionsError } = await supabase.functions.invoke('admin-populate', {
        body: { task: 'populate_all' }
      });

      if (conditionsError) {
        throw conditionsError;
      }

      setCompleted(['conditions', 'evidence', 'assessment_tools']);
      setProgress(50);
      
      toast({
        title: "Core data populated!",
        description: "Database initialized successfully",
      });

      setCurrentTask("Complete! Redirecting...");
      setProgress(100);
      
      setTimeout(() => navigate('/'), 1500);
      
    } catch (error: any) {
      console.error('Population error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to populate database. Please try again.",
        variant: "destructive",
      });
      setProgress(0);
    } finally {
      setIsPopulating(false);
      setCurrentTask("");
    }
  };

  const populateRheumatologyEvidence = async () => {
    setIsPopulatingRheum(true);
    setCurrentTask("Adding rheumatology evidence...");
    
    try {
      const { data, error } = await supabase.functions.invoke('populate-rheumatology-evidence');

      if (error) {
        throw error;
      }

      const conditions = data?.conditions || [];
      
      toast({
        title: "Success!",
        description: `Added evidence for ${conditions.join(', ')}`,
      });
      
    } catch (error: any) {
      console.error('Rheumatology evidence error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add rheumatology evidence",
        variant: "destructive",
      });
    } finally {
      setIsPopulatingRheum(false);
      setCurrentTask("");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="h-6 w-6 text-primary" />
              <CardTitle>Database Population</CardTitle>
            </div>
            <CardDescription>
              Populate the database with real physiotherapy evidence, conditions, and assessment tools
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                This will populate the database with:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>21 medical conditions (MSK, Neurological, Respiratory)</li>
                  <li>Evidence-based research papers</li>
                  <li>Validated assessment tools</li>
                </ul>
              </AlertDescription>
            </Alert>

            {progress > 0 && (
              <div className="space-y-2">
                <Progress value={progress} className="w-full" />
                <p className="text-sm text-muted-foreground text-center">{progress}% complete</p>
              </div>
            )}

            {completed.length > 0 && (
              <div className="space-y-2">
                {completed.map((task) => (
                  <div key={task} className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="capitalize">{task.replace('_', ' ')} populated</span>
                  </div>
                ))}
              </div>
            )}

            <Button
              onClick={populateDatabase}
              disabled={isPopulating}
              className="w-full"
              size="lg"
            >
              {isPopulating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Populating Database...
                </>
              ) : (
                <>
                  <Database className="mr-2 h-4 w-4" />
                  Populate Database
                </>
              )}
            </Button>

            <div className="pt-4 border-t">
              <h3 className="font-medium mb-2">Add Rheumatology Evidence</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Add evidence articles for Gout, Psoriatic Arthritis, PMR, and Lupus
              </p>
              <Button
                onClick={populateRheumatologyEvidence}
                disabled={isPopulatingRheum}
                variant="outline"
                className="w-full"
              >
                {isPopulatingRheum ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding Evidence...
                  </>
                ) : (
                  <>
                    <Database className="mr-2 h-4 w-4" />
                    Add Rheumatology Evidence
                  </>
                )}
              </Button>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              This process may take a minute. Please don't close this page.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
