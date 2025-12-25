import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

interface SessionData {
  sessionType: string;
  durationMinutes?: number;
  interventions?: string[];
  notes?: string;
  satisfactionScore?: number;
  outcomes?: Record<string, any>;
}

export const useActivityTracking = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  // Track activity stats
  const trackActivity = useCallback(async (activityType: string, incrementValue: number = 1) => {
    if (!user) return;

    try {
      const { error } = await supabase.rpc('update_user_activity_stat', {
        stat_type: activityType,
        increment_value: incrementValue
      });

      if (error) {
        console.warn('Failed to track activity:', error);
      }
    } catch (error) {
      console.warn('Activity tracking error:', error);
    }
  }, [user]);

  // Track evidence views and searches
  const trackEvidenceView = useCallback(async (evidenceId?: string, searchQuery?: string) => {
    if (!user) return;

    try {
      const { error: logError } = await supabase
        .from('evidence_access_logs')
        .insert({
          user_id: user.id,
          evidence_id: evidenceId,
          action_type: evidenceId ? 'view' : 'search',
          search_query: searchQuery
        });

      if (logError) {
        console.warn('Failed to log evidence access:', logError);
      }

      await trackActivity(evidenceId ? 'evidence_view' : 'evidence_search');
    } catch (error) {
      console.warn('Evidence tracking error:', error);
    }
  }, [user, trackActivity]);

  // Track AI chat sessions
  const trackAIChatSession = useCallback(async (messageCount: number, durationMinutes: number) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('analytics_sessions')
        .insert({
          user_id: user.id,
          session_type: 'AI Chat Session',
          duration_minutes: durationMinutes,
          interventions: ['AI Consultation'],
          notes: `${messageCount} messages exchanged`,
          outcomes: {
            messages: messageCount,
            completed: true
          }
        });

      if (error) {
        console.warn('Failed to track AI chat session:', error);
      }

      await trackActivity('collaboration');
    } catch (error) {
      console.warn('AI chat tracking error:', error);
    }
  }, [user, trackActivity]);

  // Track anatomy viewer usage
  const trackAnatomyViewer = useCallback(async (region: string, durationMinutes: number) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('analytics_sessions')
        .insert({
          user_id: user.id,
          session_type: 'Anatomy Study',
          duration_minutes: durationMinutes,
          interventions: ['3D Anatomy Exploration'],
          notes: `Studied ${region}`,
          outcomes: {
            region,
            educational: true
          }
        });

      if (error) {
        console.warn('Failed to track anatomy viewer:', error);
      }
    } catch (error) {
      console.warn('Anatomy viewer tracking error:', error);
    }
  }, [user]);

  // Track AI summarizer usage
  const trackAISummarizer = useCallback(async (articleCount: number) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('analytics_sessions')
        .insert({
          user_id: user.id,
          session_type: 'AI Evidence Analysis',
          duration_minutes: 5,
          interventions: ['AI Summarization'],
          notes: `Analyzed ${articleCount} article(s)`,
          outcomes: {
            articlesAnalyzed: articleCount
          }
        });

      if (error) {
        console.warn('Failed to track AI summarizer:', error);
      }

      await trackActivity('evidence_view');
    } catch (error) {
      console.warn('AI summarizer tracking error:', error);
    }
  }, [user, trackActivity]);

  // Create a practice session
  const createSession = useCallback(async (sessionData: SessionData) => {
    if (!user) return null;

    try {
      const { data, error } = await supabase
        .from('analytics_sessions')
        .insert({
          user_id: user.id,
          session_type: sessionData.sessionType,
          duration_minutes: sessionData.durationMinutes || 0,
          interventions: sessionData.interventions || [],
          notes: sessionData.notes,
          satisfaction_score: sessionData.satisfactionScore,
          outcomes: sessionData.outcomes || {}
        })
        .select()
        .single();

      if (error) {
        console.error('Failed to create session:', error);
        toast({
          title: "Error",
          description: "Failed to save session data",
          variant: "destructive"
        });
        return null;
      }

      return data;
    } catch (error) {
      console.error('Session creation error:', error);
      return null;
    }
  }, [user, toast]);

  return {
    trackActivity,
    trackEvidenceView,
    trackLogin: () => trackActivity('login'),
    trackProtocolCreated: () => trackActivity('protocol_created'),
    trackProtocolShared: () => trackActivity('protocol_shared'),
    trackAssessmentCompleted: () => trackActivity('assessment_completed'),
    trackCPDActivity: () => trackActivity('cpd_activity'),
    trackCollaboration: () => trackActivity('collaboration'),
    trackAIChatSession,
    trackAnatomyViewer,
    trackAISummarizer,
    createSession
  };
};
