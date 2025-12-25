import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Plus } from "lucide-react";

export const AddSessionForm = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    session_type: '',
    duration_minutes: '',
    satisfaction_score: '',
    interventions: '',
    notes: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      setLoading(true);

      const interventionsArray = formData.interventions
        .split(',')
        .map(i => i.trim())
        .filter(i => i.length > 0);

      const { error } = await supabase
        .from('analytics_sessions')
        .insert({
          user_id: user.id,
          session_type: formData.session_type,
          duration_minutes: parseInt(formData.duration_minutes),
          satisfaction_score: parseInt(formData.satisfaction_score),
          interventions: interventionsArray,
          notes: formData.notes
        });

      if (error) throw error;

      toast({
        title: "Session Added",
        description: "Practice session has been recorded successfully",
      });

      // Reset form
      setFormData({
        session_type: '',
        duration_minutes: '',
        satisfaction_score: '',
        interventions: '',
        notes: ''
      });

      // Reload page to refresh analytics
      window.location.reload();
    } catch (error: any) {
      console.error('Error adding session:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add session",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Add Practice Session
        </CardTitle>
        <CardDescription>
          Record a patient session to track analytics
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="session_type">Session Type / Condition</Label>
            <Input
              id="session_type"
              placeholder="e.g., Lower Back Pain, Knee Rehabilitation"
              value={formData.session_type}
              onChange={(e) => setFormData({ ...formData, session_type: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                min="1"
                max="300"
                placeholder="45"
                value={formData.duration_minutes}
                onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="satisfaction">Patient Satisfaction (1-10)</Label>
              <Input
                id="satisfaction"
                type="number"
                min="1"
                max="10"
                placeholder="8"
                value={formData.satisfaction_score}
                onChange={(e) => setFormData({ ...formData, satisfaction_score: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="interventions">Interventions (comma-separated)</Label>
            <Input
              id="interventions"
              placeholder="Manual Therapy, Exercise Therapy, Education"
              value={formData.interventions}
              onChange={(e) => setFormData({ ...formData, interventions: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Enter multiple interventions separated by commas
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Session notes and observations..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Adding..." : "Add Session"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
