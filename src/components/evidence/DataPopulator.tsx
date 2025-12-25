import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  Database, 
  Search, 
  BookOpen, 
  FileText, 
  Brain,
  CheckCircle,
  AlertCircle,
  Loader2,
  Sparkles
} from "lucide-react";
import JSON5 from "json5";
import { useAuth } from "@/hooks/useAuth";

interface PopulationTask {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  progress: number;
  results?: any;
  error?: string;
}

export const DataPopulator = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<PopulationTask[]>([
    {
      id: 'generate-additional-conditions',
      name: 'Generate Additional Conditions',
      description: 'Use AI to create comprehensive condition database with respiratory conditions',
      status: 'pending',
      progress: 0
    },
    {
      id: 'populate-pubmed',
      name: 'PubMed Research',
      description: 'Fetch latest research from PubMed for all conditions',
      status: 'pending',
      progress: 0
    },
    {
      id: 'populate-cochrane',
      name: 'Cochrane Reviews',
      description: 'Get systematic reviews from Cochrane database',
      status: 'pending',
      progress: 0
    },
    {
      id: 'populate-pedro',
      name: 'PEDro Studies',
      description: 'Fetch high-quality physiotherapy trials from PEDro',
      status: 'pending',
      progress: 0
    },
    {
      id: 'populate-nice',
      name: 'NICE Guidelines',
      description: 'Get clinical practice guidelines from NICE',
      status: 'pending',
      progress: 0
    },
    {
      id: 'generate-assessment-tools',
      name: 'Assessment Tools',
      description: 'Create comprehensive assessment tool library using AI',
      status: 'pending',
      progress: 0
    }
  ]);
  const [isRunning, setIsRunning] = useState(false);
  const { toast } = useToast();

  const updateTaskStatus = (taskId: string, updates: Partial<PopulationTask>) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId ? { ...task, ...updates } : task
    ));
  };

  const generateAdditionalConditions = async () => {
    updateTaskStatus('generate-additional-conditions', { status: 'running', progress: 10 });
    
    try {
      // Generate respiratory conditions using ChatGPT
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          messages: [{
            role: 'user',
            content: `Generate 8 comprehensive respiratory physiotherapy conditions in JSON format. Each condition should have:
            - name: string (condition name)
            - category: "respiratory" 
            - description: string (detailed clinical description)
            - icd_codes: string[] (relevant ICD codes)
            - keywords: string[] (clinical keywords)
            - prevalence_data: object (with prevalence statistics)
            
            Focus on conditions like COPD, Asthma, Pneumonia, Pulmonary Fibrosis, etc.
            Return ONLY valid JSON array format, no markdown code blocks.`
          }],
          context: 'Generate respiratory physiotherapy conditions for clinical database',
          specialty: 'respiratory'
        }
      });

      if (error) throw error;

      updateTaskStatus('generate-additional-conditions', { progress: 50 });

      // Parse and insert conditions
      try {
        // Clean response - remove markdown code blocks if present
        let cleanResponse = data.response.trim();
        cleanResponse = cleanResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        
        // Use JSON5 for more robust parsing
        const conditionsData = JSON5.parse(cleanResponse);
        
        if (!Array.isArray(conditionsData)) {
          throw new Error('Response is not an array');
        }
        
        let insertedCount = 0;
        for (const condition of conditionsData) {
          const { error: insertError } = await supabase
            .from('conditions')
            .insert(condition);
          
          if (insertError) {
            console.error('Error inserting condition:', insertError);
          } else {
            insertedCount++;
          }
        }

        updateTaskStatus('generate-additional-conditions', { 
          status: 'completed', 
          progress: 100,
          results: `Generated ${insertedCount} respiratory conditions`
        });
      } catch (parseError: any) {
        console.error('Parse error:', parseError, 'Response:', data.response);
        throw new Error(`Failed to parse AI response: ${parseError.message}`);
      }

    } catch (error: any) {
      updateTaskStatus('generate-additional-conditions', { 
        status: 'error', 
        error: error.message 
      });
    }
  };

  const populateDatabase = async (database: string, taskId: string) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to populate database",
        variant: "destructive",
      });
      return;
    }

    updateTaskStatus(taskId, { status: 'running', progress: 5 });

    try {
      // Gather a small set of conditions to build a combined query
      const { data: conditions, error: conditionsError } = await supabase
        .from('conditions')
        .select('name')
        .limit(5);

      if (conditionsError) throw conditionsError;

      const names = (conditions ?? []).map((c: any) => c.name).filter(Boolean);
      const searchTerms = names.join(', ');

      // Map task to evidence-sync source
      const sourceMap: Record<string, string> = {
        pubmed: 'pubmed',
        cochrane: 'cochrane',
        pedro: 'pedro',
        nice: 'guidelines',
      };

      const src = sourceMap[database];
      if (!src) throw new Error('Unknown evidence source');

      // Use the orchestrator function to avoid CF timeouts and heavy client work
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000);
      try {
        updateTaskStatus(taskId, { progress: 20 });
        const { data, error } = await supabase.functions.invoke('evidence-sync', {
          body: {
            searchTerms: searchTerms || 'physiotherapy physical therapy',
            sources: [src],
            maxResults: 12,
          },
          signal: controller.signal as any,
        } as any);

        if (error) throw error;
        updateTaskStatus(taskId, { progress: 90 });

        const count = Number(
          data?.sources_processed?.[0]?.count ?? data?.total_articles ?? 0
        );

        updateTaskStatus(taskId, {
          status: 'completed',
          progress: 100,
          results: `Fetched ${count} items from ${database}`,
        });
      } finally {
        clearTimeout(timeout);
      }
    } catch (error: any) {
      console.error(`[DataPopulator] ${database} failed`, error);
      updateTaskStatus(taskId, {
        status: 'error',
        error: error?.message || 'Task failed',
      });
    }
  };

  const generateAssessmentTools = async () => {
    updateTaskStatus('generate-assessment-tools', { status: 'running', progress: 10 });
    
    try {
      // Get all conditions to create tools for
      const { data: conditions, error: conditionsError } = await supabase
        .from('conditions')
        .select('*');

      if (conditionsError) throw conditionsError;

      updateTaskStatus('generate-assessment-tools', { progress: 30 });

      // Generate assessment tools using robust edge function (structured output)
      const { data: genData, error } = await supabase.functions.invoke('generate-assessment-tools', {
        body: { num_tools: 20 }
      });

      if (error) throw error;

updateTaskStatus('generate-assessment-tools', { progress: 90 });

const inserted = Number(genData?.inserted ?? 0);
const total = Number(genData?.total ?? 0);
const skipped = Number(genData?.skipped ?? Math.max(0, total - inserted));

updateTaskStatus('generate-assessment-tools', {
  status: 'completed',
  progress: 100,
  results: `Inserted ${inserted}/${total} assessment tools${skipped ? ` (${skipped} skipped)` : ''}`
});

    } catch (error: any) {
      updateTaskStatus('generate-assessment-tools', { 
        status: 'error', 
        error: error.message 
      });
    }
  };

  const runAllTasks = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to run population tasks",
        variant: "destructive",
      });
      return;
    }

    setIsRunning(true);
    
    try {
      // Run tasks sequentially with better error handling
      await generateAdditionalConditions();
      await new Promise(resolve => setTimeout(resolve, 2000)); // Delay between tasks
      
      await populateDatabase('pubmed', 'populate-pubmed');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      await populateDatabase('cochrane', 'populate-cochrane');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      await populateDatabase('pedro', 'populate-pedro');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      await populateDatabase('nice', 'populate-nice');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      await generateAssessmentTools();
      
      toast({
        title: "Population Complete!",
        description: "Successfully populated condition modules with data",
      });
    } catch (error: any) {
      console.error('Population error:', error);
      toast({
        title: "Population Error",
        description: error.message || "Some tasks may have failed. Check individual task status.",
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
    }
  };

  const runSingleTask = async (taskId: string) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to run tasks",
        variant: "destructive",
      });
      return;
    }

    try {
      toast({
        title: "Task Started",
        description: `Starting ${tasks.find(t => t.id === taskId)?.name}...`,
      });

      switch (taskId) {
        case 'generate-additional-conditions':
          await generateAdditionalConditions();
          break;
        case 'populate-pubmed':
          await populateDatabase('pubmed', taskId);
          break;
        case 'populate-cochrane':
          await populateDatabase('cochrane', taskId);
          break;
        case 'populate-pedro':
          await populateDatabase('pedro', taskId);
          break;
        case 'populate-nice':
          await populateDatabase('nice', taskId);
          break;
        case 'generate-assessment-tools':
          await generateAssessmentTools();
          break;
      }

      toast({
        title: "Task Completed",
        description: `Successfully completed ${tasks.find(t => t.id === taskId)?.name}`,
      });
    } catch (error: any) {
      toast({
        title: "Task Failed",
        description: error.message || "An error occurred",
        variant: "destructive",
      });
    }
  };

  const getTaskIcon = (taskId: string) => {
    switch (taskId) {
      case 'generate-additional-conditions': return <Brain className="h-4 w-4" />;
      case 'populate-pubmed': return <Search className="h-4 w-4" />;
      case 'populate-cochrane': return <BookOpen className="h-4 w-4" />;
      case 'populate-pedro': return <Database className="h-4 w-4" />;
      case 'populate-nice': return <FileText className="h-4 w-4" />;
      case 'generate-assessment-tools': return <Sparkles className="h-4 w-4" />;
      default: return <Database className="h-4 w-4" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'running': return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-primary" />
            Data Population Manager
          </CardTitle>
          <CardDescription>
            Populate condition modules with comprehensive evidence from ChatGPT, PubMed, Cochrane, PEDro, and NICE databases
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!user ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
              <p className="text-sm text-yellow-800">
                ⚠️ Please sign in to use data population features
              </p>
            </div>
          ) : null}
          
          <div className="flex gap-4">
            <Button 
              onClick={runAllTasks} 
              disabled={isRunning || !user}
              className="flex items-center gap-2"
            >
              {isRunning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {isRunning ? 'Running All Tasks...' : 'Run All Tasks'}
            </Button>
            
            <Badge variant="outline">
              {tasks.filter(t => t.status === 'completed').length} / {tasks.length} Complete
            </Badge>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tasks.map((task) => (
          <Card key={task.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getTaskIcon(task.id)}
                  <CardTitle className="text-sm">{task.name}</CardTitle>
                </div>
                {getStatusIcon(task.status)}
              </div>
              <CardDescription className="text-xs">
                {task.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Progress value={task.progress} className="h-2" />
              
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {task.progress}% complete
                </span>
                <Button
                  onClick={() => runSingleTask(task.id)}
                  disabled={task.status === 'running' || isRunning || !user}
                  size="sm"
                  variant="outline"
                >
                  {task.status === 'running' ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    'Run'
                  )}
                </Button>
              </div>

              {task.results && (
                <div className="text-xs text-green-600 bg-green-50 p-2 rounded">
                  ✓ {task.results}
                </div>
              )}

              {task.error && (
                <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                  ✗ {task.error}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};