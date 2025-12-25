import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, FileText, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

export const ProtocolDataPopulator = () => {
  const [isPopulating, setIsPopulating] = useState(false);
  const { user } = useAuth();

  // Prevent navigation during population
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isPopulating) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isPopulating]);
  // Basic schema validation for protocol JSON
  const validateProtocol = (data: any) => {
    const required = [
      'name','description','protocol_steps','duration_weeks','frequency_per_week','contraindications','precautions','expected_outcomes'
    ];
    for (const key of required) {
      if (!(key in data)) return { valid: false, reason: `Missing key: ${key}` };
    }
    if (!Array.isArray(data.protocol_steps)) return { valid: false, reason: 'protocol_steps must be an array' };
    if (typeof data.duration_weeks !== 'number') return { valid: false, reason: 'duration_weeks must be a number' };
    if (typeof data.frequency_per_week !== 'number') return { valid: false, reason: 'frequency_per_week must be a number' };
    if (!Array.isArray(data.contraindications)) return { valid: false, reason: 'contraindications must be an array' };
    if (!Array.isArray(data.precautions)) return { valid: false, reason: 'precautions must be an array' };
    return { valid: true };
  };
  const [populatedCount, setPopulatedCount] = useState(0);

  const generateTreatmentProtocol = async (condition: any, existingId?: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-protocol-json', {
        body: { condition: { id: condition.id, name: condition.name } },
      });
      if (error) {
        const msg = (error as any)?.message?.toString().toLowerCase() || '';
        if (msg.includes('429') || msg.includes('rate limit')) {
          toast.error('OpenAI rate limit exceeded. Please wait a moment and try again.');
          throw new Error('RATE_LIMIT');
        }
        if (msg.includes('401') || msg.includes('invalid') || msg.includes('api key')) {
          toast.error('Invalid OpenAI API key. Please check your configuration.');
          throw new Error('API_KEY_ERROR');
        }
        throw error;
      }

      const protocolData = data?.protocol;
      if (!protocolData) throw new Error('No protocol returned');

      const validation = validateProtocol(protocolData);
      if (!validation.valid) throw new Error(validation.reason || 'Invalid protocol schema');

      const protocolPayload = {
        name: protocolData.name,
        description: protocolData.description,
        condition_id: condition.id,
        protocol_steps: protocolData.protocol_steps,
        duration_weeks: protocolData.duration_weeks,
        frequency_per_week: protocolData.frequency_per_week,
        contraindications: protocolData.contraindications,
        precautions: protocolData.precautions,
        expected_outcomes: protocolData.expected_outcomes,
        created_by: user?.id || null,
        is_validated: false,
      };

      let upsertError;
      if (existingId) {
        ({ error: upsertError } = await supabase
          .from('treatment_protocols')
          .update(protocolPayload)
          .eq('id', existingId));
      } else {
        ({ error: upsertError } = await supabase
          .from('treatment_protocols')
          .insert(protocolPayload));
      }

      if (upsertError) throw upsertError;
      return true;
    } catch (err) {
      console.error('Error generating protocol for', condition.name, err);
      return false;
    }
  };

  const populateProtocols = async () => {
    setIsPopulating(true);
    setPopulatedCount(0);

    try {
      // Get all conditions
      const { data: conditions, error: conditionsError } = await supabase
        .from('conditions')
        .select('*')
        .order('name');

      if (conditionsError) throw conditionsError;

      let successCount = 0;
      let failedCount = 0;
      
      // Process conditions in batches of 5 for faster generation
      const BATCH_SIZE = 5;
      for (let i = 0; i < conditions.length; i += BATCH_SIZE) {
        const batch = conditions.slice(i, i + BATCH_SIZE);
        
        // Get existing protocols for this batch
        const conditionIds = batch.map(c => c.id);
        const { data: existingProtocols } = await supabase
          .from('treatment_protocols')
          .select('id, condition_id')
          .in('condition_id', conditionIds);
        
        const existingMap = new Map(existingProtocols?.map(p => [p.condition_id, p.id]) || []);
        
        // Process batch in parallel
        const results = await Promise.allSettled(
          batch.map(condition => {
            const existingId = existingMap.get(condition.id);
            console.log(`${existingId ? 'Updating' : 'Generating'} protocol for: ${condition.name}`);
            return generateTreatmentProtocol(condition, existingId);
          })
        );
        
        // Count successes and failures and detect errors
        let shouldStop = false;
        results.forEach(result => {
          if (result.status === 'fulfilled' && result.value) {
            successCount++;
          } else {
            failedCount++;
            const reason: any = (result as PromiseRejectedResult).reason;
            if (reason?.message === 'RATE_LIMIT' || reason?.message === 'API_KEY_ERROR') {
              shouldStop = true;
            }
          }
        });
        
        setPopulatedCount(successCount);
        
        if (shouldStop) {
          break;
        }
        
        // Small delay between batches to avoid rate limits
        if (i + BATCH_SIZE < conditions.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      if (failedCount > 0) {
        toast.success(`Generated ${successCount} protocols (${failedCount} failed)`);
      } else {
        toast.success(`Successfully generated ${successCount} treatment protocols!`);
      }
    } catch (error) {
      console.error('Error populating protocols:', error);
      toast.error('Failed to populate protocols');
    } finally {
      setIsPopulating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-medical-blue" />
            <CardTitle>Treatment Protocols Generator</CardTitle>
          </div>
          <Badge variant="secondary">
            <Sparkles className="h-3 w-3 mr-1" />
            AI-Powered
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-muted-foreground">
          Generate evidence-based treatment protocols for all conditions using AI.
        </p>
        
        {isPopulating && (
          <div className="bg-muted/50 p-4 rounded-lg">
            <div className="flex items-center space-x-2 text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Generating protocols... ({populatedCount} completed)</span>
            </div>
          </div>
        )}

        <Button 
          onClick={populateProtocols}
          disabled={isPopulating}
          className="w-full"
          variant="medical"
        >
          {isPopulating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating Protocols...
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Treatment Protocols
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};