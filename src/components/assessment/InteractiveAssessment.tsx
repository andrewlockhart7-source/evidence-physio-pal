import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AssessmentForm } from "./AssessmentForm";
import { AssessmentResult } from "./AssessmentResult";
import { ArrowLeft, FileText, Calculator, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useActivityTracking } from "@/hooks/useActivityTracking";

interface AssessmentTool {
  id: string;
  name: string;
  description: string | null;
  tool_type: string | null;
  scoring_method: string | null;
  interpretation_guide: any;
  psychometric_properties: any;
  reference_values: any;
  instructions: string | null;
  condition_ids: string[] | null;
}

interface InteractiveAssessmentProps {
  tool: AssessmentTool;
}

export type AssessmentPhase = 'instructions' | 'assessment' | 'results';

export const InteractiveAssessment = ({ tool }: InteractiveAssessmentProps) => {
  const [currentPhase, setCurrentPhase] = useState<AssessmentPhase>('instructions');
  const [assessmentData, setAssessmentData] = useState<any>(null);
  const [progress, setProgress] = useState(0);
  const navigate = useNavigate();
  const { trackAssessmentCompleted } = useActivityTracking();

  useEffect(() => {
    switch (currentPhase) {
      case 'instructions':
        setProgress(0);
        break;
      case 'assessment':
        setProgress(50);
        break;
      case 'results':
        setProgress(100);
        break;
    }
  }, [currentPhase]);

  const handleStartAssessment = () => {
    setCurrentPhase('assessment');
  };

  const handleCompleteAssessment = async (data: any) => {
    setAssessmentData(data);
    setCurrentPhase('results');
    
    // Track assessment completion
    await trackAssessmentCompleted();
  };

  const handleBackToLibrary = () => {
    navigate('/assessments');
  };

  const renderInstructions = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-medical-blue/10">
              <FileText className="h-5 w-5 text-medical-blue" />
            </div>
            <div>
              <CardTitle>{tool.name}</CardTitle>
              <CardDescription>{tool.description}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Assessment Type</h4>
            <Badge variant="secondary">{tool.tool_type}</Badge>
          </div>
          
          <div>
            <h4 className="font-medium mb-2">Instructions</h4>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm leading-relaxed">
                {tool.instructions || `This is a ${tool.tool_type?.toLowerCase() || 'standard'} assessment tool. Please follow the instructions carefully and answer all questions honestly. The assessment should take approximately 10-15 minutes to complete.`}
              </p>
            </div>
          </div>

          <div>
            <h4 className="font-medium mb-2">Scoring Method</h4>
            <p className="text-sm text-muted-foreground">
              {tool.scoring_method || 'Standard scoring method will be applied automatically'}
            </p>
          </div>

          {tool.psychometric_properties && Object.keys(tool.psychometric_properties).length > 0 && (
            <div>
              <h4 className="font-medium mb-2">Psychometric Properties</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {Object.entries(tool.psychometric_properties).map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <span className="capitalize">{key.replace(/_/g, ' ')}:</span>
                    <span className="font-medium">{value as string}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button variant="outline" onClick={handleBackToLibrary}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Library
        </Button>
        <Button onClick={handleStartAssessment} className="flex-1">
          <Calculator className="h-4 w-4 mr-2" />
          Start Assessment
        </Button>
      </div>
    </div>
  );

  const renderPhase = () => {
    switch (currentPhase) {
      case 'instructions':
        return renderInstructions();
      case 'assessment':
        return (
          <AssessmentForm 
            tool={tool} 
            onComplete={handleCompleteAssessment}
            onBack={() => setCurrentPhase('instructions')}
          />
        );
      case 'results':
        return (
          <AssessmentResult 
            tool={tool} 
            data={assessmentData}
            onRestart={() => setCurrentPhase('instructions')}
            onBackToLibrary={handleBackToLibrary}
          />
        );
      default:
        return renderInstructions();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Progress Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl font-bold">{tool.name}</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Progress:</span>
              <span className="font-medium">{progress}%</span>
            </div>
          </div>
          
          <Progress value={progress} className="h-2" />
          
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span className={currentPhase === 'instructions' ? 'text-foreground font-medium' : ''}>
              Instructions
            </span>
            <span className={currentPhase === 'assessment' ? 'text-foreground font-medium' : ''}>
              Assessment
            </span>
            <span className={currentPhase === 'results' ? 'text-foreground font-medium' : ''}>
              Results
            </span>
          </div>
        </div>

        {/* Main Content */}
        {renderPhase()}
      </div>
    </div>
  );
};