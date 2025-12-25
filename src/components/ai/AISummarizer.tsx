import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Brain, Sparkles, FileText, HelpCircle, Volume2, Loader2 } from "lucide-react";
import { playTextToSpeech } from "@/utils/audioUtils";
import { useActivityTracking } from "@/hooks/useActivityTracking";

interface AISummarizerProps {
  condition?: string;
}

export const AISummarizer = ({ condition }: AISummarizerProps) => {
  const [evidenceText, setEvidenceText] = useState("");
  const [selectedCondition, setSelectedCondition] = useState(condition || "");
  const [activeTab, setActiveTab] = useState("summary");
  const [results, setResults] = useState<{
    summary?: string;
    recommendations?: string;
    clinical_questions?: string;
  }>({});
  const [loading, setLoading] = useState<{
    summary: boolean;
    recommendations: boolean;
    clinical_questions: boolean;
  }>({ summary: false, recommendations: false, clinical_questions: false });
  const { toast } = useToast();
  const { trackAISummarizer, trackEvidenceView } = useActivityTracking();

  const handleAnalyze = async (requestType: 'summary' | 'recommendations' | 'clinical_questions') => {
    if (!evidenceText.trim()) {
      toast({
        title: "Evidence text required",
        description: "Please paste research evidence text to analyze",
        variant: "destructive",
      });
      return;
    }

    setLoading(prev => ({ ...prev, [requestType]: true }));

    try {
      const { data, error } = await supabase.functions.invoke('ai-evidence-summarizer', {
        body: {
          evidenceText: evidenceText.trim(),
          condition: selectedCondition,
          requestType
        }
      });

      if (error) throw error;

      setResults(prev => ({ ...prev, [requestType]: data.response }));
      setActiveTab(requestType);

      // Track AI summarizer usage
      await trackAISummarizer(1);
      await trackEvidenceView();

      toast({
        title: "Analysis complete",
        description: `AI ${requestType.replace('_', ' ')} generated successfully`,
      });
    } catch (error: any) {
      console.error('Error analyzing evidence:', error);
      toast({
        title: "Analysis failed",
        description: error.message || "Failed to analyze evidence with AI",
        variant: "destructive",
      });
    } finally {
      setLoading(prev => ({ ...prev, [requestType]: false }));
    }
  };

  const handlePlayAudio = async (text: string) => {
    try {
      await playTextToSpeech(text);
    } catch (error) {
      toast({
        title: "Audio playback failed",
        description: "Could not play text as speech",
        variant: "destructive",
      });
    }
  };

  const getTabIcon = (tab: string) => {
    switch (tab) {
      case 'summary': return <FileText className="h-4 w-4" />;
      case 'recommendations': return <Sparkles className="h-4 w-4" />;
      case 'clinical_questions': return <HelpCircle className="h-4 w-4" />;
      default: return <Brain className="h-4 w-4" />;
    }
  };

  const getTabLabel = (tab: string) => {
    switch (tab) {
      case 'summary': return 'Evidence Summary';
      case 'recommendations': return 'Treatment Recommendations';
      case 'clinical_questions': return 'Clinical Questions';
      default: return tab;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            AI Evidence Analyzer
          </CardTitle>
          <CardDescription>
            Paste research evidence and get AI-powered summaries, recommendations, and clinical insights
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Condition (Optional)</label>
            <Select value={selectedCondition} onValueChange={setSelectedCondition}>
              <SelectTrigger>
                <SelectValue placeholder="Select a condition..." />
              </SelectTrigger>
              <SelectContent>
                {/* Musculoskeletal Conditions */}
                <SelectItem value="low-back-pain">Low Back Pain</SelectItem>
                <SelectItem value="neck-pain">Neck Pain</SelectItem>
                <SelectItem value="knee-osteoarthritis">Knee Osteoarthritis</SelectItem>
                <SelectItem value="shoulder-impingement">Shoulder Impingement</SelectItem>
                <SelectItem value="tennis-elbow">Tennis Elbow</SelectItem>
                <SelectItem value="plantar-fasciitis">Plantar Fasciitis</SelectItem>
                
                {/* Neurological Conditions */}
                <SelectItem value="stroke">Stroke</SelectItem>
                <SelectItem value="multiple-sclerosis">Multiple Sclerosis</SelectItem>
                <SelectItem value="parkinsons-disease">Parkinson's Disease</SelectItem>
                <SelectItem value="spinal-cord-injury">Spinal Cord Injury</SelectItem>
                <SelectItem value="traumatic-brain-injury">Traumatic Brain Injury</SelectItem>
                <SelectItem value="peripheral-neuropathy">Peripheral Neuropathy</SelectItem>
                
                {/* Respiratory Conditions */}
                <SelectItem value="copd">COPD</SelectItem>
                <SelectItem value="asthma">Asthma</SelectItem>
                <SelectItem value="pneumonia">Pneumonia</SelectItem>
                <SelectItem value="pulmonary-fibrosis">Pulmonary Fibrosis</SelectItem>
                <SelectItem value="cystic-fibrosis">Cystic Fibrosis</SelectItem>
                <SelectItem value="sleep-apnea">Sleep Apnea</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Research Evidence Text</label>
            <Textarea
              placeholder="Paste research abstract, study results, systematic review findings, or clinical guidelines here..."
              value={evidenceText}
              onChange={(e) => setEvidenceText(e.target.value)}
              className="min-h-32"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => handleAnalyze('summary')}
              disabled={loading.summary}
              variant="default"
              size="sm"
            >
              {loading.summary ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileText className="h-4 w-4 mr-2" />
              )}
              Generate Summary
            </Button>
            <Button
              onClick={() => handleAnalyze('recommendations')}
              disabled={loading.recommendations}
              variant="outline"
              size="sm"
            >
              {loading.recommendations ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              Get Recommendations
            </Button>
            <Button
              onClick={() => handleAnalyze('clinical_questions')}
              disabled={loading.clinical_questions}
              variant="outline"
              size="sm"
            >
              {loading.clinical_questions ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <HelpCircle className="h-4 w-4 mr-2" />
              )}
              Clinical Questions
            </Button>
          </div>
        </CardContent>
      </Card>

      {(results.summary || results.recommendations || results.clinical_questions) && (
        <Card>
          <CardHeader>
            <CardTitle>AI Analysis Results</CardTitle>
            {selectedCondition && (
              <Badge variant="secondary" className="w-fit">
                {selectedCondition.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                {(['summary', 'recommendations', 'clinical_questions'] as const).map((tab) => (
                  <TabsTrigger
                    key={tab}
                    value={tab}
                    disabled={!results[tab]}
                    className="flex items-center gap-2"
                  >
                    {getTabIcon(tab)}
                    <span className="hidden sm:inline">{getTabLabel(tab)}</span>
                  </TabsTrigger>
                ))}
              </TabsList>

              {(['summary', 'recommendations', 'clinical_questions'] as const).map((tab) => (
                <TabsContent key={tab} value={tab} className="mt-4">
                  {results[tab] && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          {getTabIcon(tab)}
                          {getTabLabel(tab)}
                        </h3>
                        <Button
                          onClick={() => handlePlayAudio(results[tab]!)}
                          variant="outline"
                          size="sm"
                        >
                          <Volume2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="prose prose-sm max-w-none">
                        <div className="whitespace-pre-wrap text-sm leading-relaxed">
                          {results[tab]}
                        </div>
                      </div>
                    </div>
                  )}
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
};