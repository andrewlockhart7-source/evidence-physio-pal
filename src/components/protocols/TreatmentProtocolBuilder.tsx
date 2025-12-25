import { useState, useEffect } from "react";
import { PremiumFeature } from "@/components/subscription/PremiumFeature";
import { useSubscription } from "@/hooks/useSubscription";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useActivityTracking } from "@/hooks/useActivityTracking";
import {
  Plus,
  Target,
  Clock,
  Users,
  AlertTriangle,
  CheckCircle,
  Trash2,
  Save,
  Eye,
  Edit,
} from "lucide-react";

interface ProtocolStep {
  id: string;
  phase: string;
  duration: string;
  exercises: string[];
  goals: string[];
  progressMarkers: string[];
}

interface TreatmentProtocol {
  name: string;
  description: string;
  condition_id: string;
  duration_weeks: number;
  frequency_per_week: number;
  contraindications: string[];
  precautions: string[];
  expected_outcomes: string;
  protocol_steps: ProtocolStep[];
}

export const TreatmentProtocolBuilder = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { subscribed } = useSubscription();
  const { trackProtocolCreated } = useActivityTracking();
  
  if (!subscribed) {
    return (
      <div className="container mx-auto px-4 py-8">
        <PremiumFeature feature="the Treatment Protocol Builder" showUpgrade={true}>
          <div className="text-center py-12">
            <Target className="h-16 w-16 mx-auto mb-6 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-4">Treatment Protocol Builder</h2>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Create structured, evidence-based treatment protocols with phased exercises and outcome measures.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-6xl mx-auto mb-8">
              <div className="p-4 border rounded-lg">
                <Clock className="h-8 w-8 mx-auto mb-2 text-primary" />
                <h3 className="font-semibold mb-2">Phased Protocols</h3>
                <p className="text-sm text-muted-foreground">Structure treatments in progressive phases</p>
              </div>
              <div className="p-4 border rounded-lg">
                <Plus className="h-8 w-8 mx-auto mb-2 text-primary" />
                <h3 className="font-semibold mb-2">Exercise Library</h3>
                <p className="text-sm text-muted-foreground">Access evidence-based exercise recommendations</p>
              </div>
              <div className="p-4 border rounded-lg">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-primary" />
                <h3 className="font-semibold mb-2">Safety Tracking</h3>
                <p className="text-sm text-muted-foreground">Include contraindications and precautions</p>
              </div>
              <div className="p-4 border rounded-lg">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 text-primary" />
                <h3 className="font-semibold mb-2">Outcome Measures</h3>
                <p className="text-sm text-muted-foreground">Define expected outcomes and progress markers</p>
              </div>
            </div>
          </div>
        </PremiumFeature>
      </div>
    );
  }
  
  const [protocol, setProtocol] = useState<TreatmentProtocol>({
    name: '',
    description: '',
    condition_id: '',
    duration_weeks: 12,
    frequency_per_week: 3,
    contraindications: [],
    precautions: [],
    expected_outcomes: '',
    protocol_steps: []
  });

  const [currentStep, setCurrentStep] = useState<ProtocolStep>({
    id: '',
    phase: '',
    duration: '',
    exercises: [],
    goals: [],
    progressMarkers: []
  });

  const [editingStep, setEditingStep] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  const [conditions, setConditions] = useState<Array<{ id: string; name: string; category: string }>>([]);
  const [loadingConditions, setLoadingConditions] = useState(true);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('conditions')
          .select('id, name, category')
          .order('name');
        if (error) throw error;
        if (isMounted) setConditions(data || []);
      } catch (e: any) {
        toast({
          title: 'Failed to load conditions',
          description: e.message || 'Please try again later.',
          variant: 'destructive',
        });
      } finally {
        if (isMounted) setLoadingConditions(false);
      }
    })();
    return () => { isMounted = false; };
  }, [toast]);

  const predefinedExercises = {
    'Low Back Pain': [
      'Pelvic tilts',
      'Cat-cow stretches',
      'Dead bugs',
      'Bird dogs',
      'Glute bridges',
      'Wall sits',
      'Knee-to-chest stretches',
      'Lower trunk rotation',
      'Progressive loading exercises'
    ],
    'Shoulder Impingement': [
      'Pendulum exercises',
      'Passive ROM exercises',
      'Scapular stabilization',
      'Rotator cuff strengthening',
      'Posterior capsule stretching',
      'Progressive resistive exercises',
      'Functional movement training'
    ],
    'Stroke Rehabilitation': [
      'Passive ROM exercises',
      'Active-assisted movements',
      'Weight-bearing exercises',
      'Balance training',
      'Gait training',
      'Functional reaching',
      'Task-specific training'
    ]
  };

  const phases = [
    'Acute Phase (0-2 weeks)',
    'Sub-acute Phase (2-6 weeks)',
    'Chronic Phase (6-12 weeks)',
    'Maintenance Phase (12+ weeks)'
  ];

  const addStep = () => {
    if (!currentStep.phase || !currentStep.duration) {
      toast({
        title: "Missing Information",
        description: "Please fill in phase and duration for the step.",
        variant: "destructive",
      });
      return;
    }

    const newStep = {
      ...currentStep,
      id: Date.now().toString()
    };

    setProtocol(prev => ({
      ...prev,
      protocol_steps: [...prev.protocol_steps, newStep]
    }));

    setCurrentStep({
      id: '',
      phase: '',
      duration: '',
      exercises: [],
      goals: [],
      progressMarkers: []
    });

    toast({
      title: "Step Added",
      description: "Protocol step has been added successfully.",
    });
  };

  const removeStep = (stepId: string) => {
    setProtocol(prev => ({
      ...prev,
      protocol_steps: prev.protocol_steps.filter(step => step.id !== stepId)
    }));
  };

  const addExercise = (exercise: string) => {
    if (editingStep) {
      setProtocol(prev => ({
        ...prev,
        protocol_steps: prev.protocol_steps.map(step =>
          step.id === editingStep
            ? { ...step, exercises: [...step.exercises, exercise] }
            : step
        )
      }));
    } else {
      setCurrentStep(prev => ({
        ...prev,
        exercises: [...prev.exercises, exercise]
      }));
    }
  };

  const removeExercise = (exercise: string) => {
    if (editingStep) {
      setProtocol(prev => ({
        ...prev,
        protocol_steps: prev.protocol_steps.map(step =>
          step.id === editingStep
            ? { ...step, exercises: step.exercises.filter(ex => ex !== exercise) }
            : step
        )
      }));
    } else {
      setCurrentStep(prev => ({
        ...prev,
        exercises: prev.exercises.filter(ex => ex !== exercise)
      }));
    }
  };

  const saveProtocol = async () => {
    if (!protocol.name || !protocol.condition_id || protocol.protocol_steps.length === 0) {
      toast({
        title: "Incomplete Protocol",
        description: "Please fill in name, condition, and add at least one step.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    if (!user?.id) {
      toast({
        title: "Authentication required",
        description: "Please sign in to save a protocol.",
        variant: "destructive",
      });
      setSaving(false);
      return;
    }
    try {
      const { error } = await supabase
        .from('treatment_protocols')
        .insert({
          name: protocol.name,
          description: protocol.description,
          condition_id: protocol.condition_id,
          duration_weeks: protocol.duration_weeks,
          frequency_per_week: protocol.frequency_per_week,
          contraindications: protocol.contraindications,
          precautions: protocol.precautions,
          expected_outcomes: protocol.expected_outcomes,
          protocol_steps: protocol.protocol_steps as any,
          created_by: user?.id,
          is_validated: false
        });

      if (error) throw error;

      // Track protocol creation
      await trackProtocolCreated();

      toast({
        title: "Protocol Saved",
        description: "Your treatment protocol has been saved successfully.",
      });

      // Reset form
      setProtocol({
        name: '',
        description: '',
        condition_id: '',
        duration_weeks: 12,
        frequency_per_week: 3,
        contraindications: [],
        precautions: [],
        expected_outcomes: '',
        protocol_steps: []
      });

    } catch (error: any) {
      toast({
        title: "Save Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const selectedCondition = conditions.find(c => c.id === protocol.condition_id);
  const suggestedExercises = selectedCondition ? 
    predefinedExercises[selectedCondition.name as keyof typeof predefinedExercises] || [] : [];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Treatment Protocol Builder</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Create evidence-based treatment protocols with structured phases, exercises, and outcome measures.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Protocol Information */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Protocol Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="protocol-name">Protocol Name</Label>
                  <Input
                    id="protocol-name"
                    value={protocol.name}
                    onChange={(e) => setProtocol(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Evidence-Based Low Back Pain Protocol"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="condition">Condition</Label>
                  <Select
                    value={protocol.condition_id}
                    onValueChange={(value) => setProtocol(prev => ({ ...prev, condition_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select condition" />
                    </SelectTrigger>
                    <SelectContent>
                      {conditions.map(condition => (
                        <SelectItem key={condition.id} value={condition.id}>
                          {condition.name} ({condition.category})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={protocol.description}
                  onChange={(e) => setProtocol(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the protocol's purpose and approach..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (weeks)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={protocol.duration_weeks}
                    onChange={(e) => setProtocol(prev => ({ ...prev, duration_weeks: parseInt(e.target.value) }))}
                    min="1"
                    max="52"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="frequency">Frequency (per week)</Label>
                  <Input
                    id="frequency"
                    type="number"
                    value={protocol.frequency_per_week}
                    onChange={(e) => setProtocol(prev => ({ ...prev, frequency_per_week: parseInt(e.target.value) }))}
                    min="1"
                    max="7"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="outcomes">Expected Outcomes</Label>
                <Textarea
                  id="outcomes"
                  value={protocol.expected_outcomes}
                  onChange={(e) => setProtocol(prev => ({ ...prev, expected_outcomes: e.target.value }))}
                  placeholder="Describe expected patient outcomes and goals..."
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Protocol Steps */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Protocol Steps
              </CardTitle>
              <CardDescription>
                Add phases and exercises to your treatment protocol
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Current Steps */}
              {protocol.protocol_steps.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium">Protocol Phases ({protocol.protocol_steps.length})</h4>
                  {protocol.protocol_steps.map((step, index) => (
                    <Card key={step.id} className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h5 className="font-medium">{step.phase}</h5>
                          <p className="text-sm text-muted-foreground">Duration: {step.duration}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingStep(step.id)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeStep(step.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      
                      {step.exercises.length > 0 && (
                        <div className="mt-2">
                          <p className="text-sm font-medium mb-1">Exercises:</p>
                          <div className="flex flex-wrap gap-1">
                            {step.exercises.map(exercise => (
                              <Badge key={exercise} variant="secondary" className="text-xs">
                                {exercise}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </Card>
                  ))}
                </div>
              )}

              <Separator />

              {/* Add New Step */}
              <div className="space-y-4">
                <h4 className="font-medium">Add New Phase</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Phase</Label>
                    <Select
                      value={currentStep.phase}
                      onValueChange={(value) => setCurrentStep(prev => ({ ...prev, phase: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select phase" />
                      </SelectTrigger>
                      <SelectContent>
                        {phases.map(phase => (
                          <SelectItem key={phase} value={phase}>
                            {phase}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Duration</Label>
                    <Input
                      value={currentStep.duration}
                      onChange={(e) => setCurrentStep(prev => ({ ...prev, duration: e.target.value }))}
                      placeholder="e.g., 2-4 weeks"
                    />
                  </div>
                </div>

                {/* Exercise Selection */}
                {suggestedExercises.length > 0 && (
                  <div className="space-y-2">
                    <Label>Suggested Exercises</Label>
                    <div className="flex flex-wrap gap-2">
                      {suggestedExercises.map(exercise => (
                        <Button
                          key={exercise}
                          variant="outline"
                          size="sm"
                          onClick={() => addExercise(exercise)}
                          disabled={currentStep.exercises.includes(exercise)}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          {exercise}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {currentStep.exercises.length > 0 && (
                  <div className="space-y-2">
                    <Label>Selected Exercises</Label>
                    <div className="flex flex-wrap gap-1">
                      {currentStep.exercises.map(exercise => (
                        <Badge
                          key={exercise}
                          variant="default"
                          className="cursor-pointer"
                          onClick={() => removeExercise(exercise)}
                        >
                          {exercise} ×
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <Button onClick={addStep} disabled={!currentStep.phase || !currentStep.duration}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Phase
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Safety Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Contraindications</Label>
                <Textarea
                  placeholder="List contraindications..."
                  rows={3}
                  value={protocol.contraindications.join('\n')}
                  onChange={(e) => setProtocol(prev => ({
                    ...prev,
                    contraindications: e.target.value.split('\n').filter(Boolean)
                  }))}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Precautions</Label>
                <Textarea
                  placeholder="List precautions..."
                  rows={3}
                  value={protocol.precautions.join('\n')}
                  onChange={(e) => setProtocol(prev => ({
                    ...prev,
                    precautions: e.target.value.split('\n').filter(Boolean)
                  }))}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Protocol Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span>Duration:</span>
                <span>{protocol.duration_weeks} weeks</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Frequency:</span>
                <span>{protocol.frequency_per_week}x/week</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Total Phases:</span>
                <span>{protocol.protocol_steps.length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Condition:</span>
                <span>{selectedCondition?.name || 'Not selected'}</span>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <Button 
                  onClick={saveProtocol} 
                  disabled={saving || !protocol.name || protocol.protocol_steps.length === 0}
                  className="w-full"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? 'Saving...' : 'Save Protocol'}
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => setPreviewMode(!previewMode)}
                  disabled={!protocol.name || protocol.protocol_steps.length === 0}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  {previewMode ? 'Hide Preview' : 'Preview Protocol'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Protocol Preview Modal/Section */}
      {previewMode && protocol.protocol_steps.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Protocol Preview</CardTitle>
            <CardDescription>{protocol.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Condition:</span> {selectedCondition?.name || 'N/A'}
              </div>
              <div>
                <span className="font-medium">Duration:</span> {protocol.duration_weeks} weeks
              </div>
              <div>
                <span className="font-medium">Frequency:</span> {protocol.frequency_per_week}x per week
              </div>
              <div>
                <span className="font-medium">Total Phases:</span> {protocol.protocol_steps.length}
              </div>
            </div>

            <Separator />

            <div className="space-y-4">
              <h4 className="font-semibold">Treatment Phases</h4>
              {protocol.protocol_steps.map((step, idx) => (
                <Card key={step.id}>
                  <CardHeader>
                    <CardTitle className="text-base">Phase {idx + 1}: {step.phase}</CardTitle>
                    <CardDescription>Duration: {step.duration}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {step.exercises.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2">Exercises:</p>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                          {step.exercises.map(ex => (
                            <li key={ex}>{ex}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {step.goals.length > 0 && (
                      <div>
                        <p className="text-sm font-medium mb-2">Goals:</p>
                        <ul className="list-disc list-inside space-y-1 text-sm">
                          {step.goals.map(g => (
                            <li key={g}>{g}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {protocol.expected_outcomes && (
              <>
                <Separator />
                <div>
                  <h4 className="font-semibold mb-2">Expected Outcomes</h4>
                  <p className="text-sm text-muted-foreground">{protocol.expected_outcomes}</p>
                </div>
              </>
            )}

            {(protocol.contraindications.length > 0 || protocol.precautions.length > 0) && (
              <>
                <Separator />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {protocol.contraindications.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2 text-destructive">Contraindications</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        {protocol.contraindications.map((c, i) => (
                          <li key={i}>{c}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {protocol.precautions.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2 text-amber-600">Precautions</h4>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        {protocol.precautions.map((p, i) => (
                          <li key={i}>{p}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};