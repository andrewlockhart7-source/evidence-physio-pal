import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Target,
  AlertCircle,
  CheckCircle,
  Clock,
  Award
} from "lucide-react";

interface OutcomeMetrics {
  totalSessions: number;
  averageSatisfaction: number;
  improvementRate: number;
  protocolAdherence: number;
  patientRetention: number;
}

interface SessionOutcome {
  id: string;
  session_type: string;
  duration_minutes: number | null;
  satisfaction_score: number | null;
  outcomes: any;
  interventions: string[] | null;
  created_at: string;
  condition_id: string | null;
}

export const ClinicalAnalytics = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [metrics, setMetrics] = useState<OutcomeMetrics>({
    totalSessions: 0,
    averageSatisfaction: 0,
    improvementRate: 0,
    protocolAdherence: 0,
    patientRetention: 0
  });
  
  const [recentSessions, setRecentSessions] = useState<SessionOutcome[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchClinicalData();
    } else {
      setLoading(false);
    }
  }, [user]);

  const fetchClinicalData = async () => {
    try {
      setLoading(true);

      // Fetch session analytics
      const { data: sessions, error: sessionsError } = await supabase
        .from('analytics_sessions')
        .select('*')
        .eq('user_id', user?.id || '')
        .order('created_at', { ascending: false })
        .limit(10);

      if (sessionsError) throw sessionsError;

      const sessionData = sessions || [];
      setRecentSessions(sessionData);

      // Calculate metrics
      const totalSessions = sessionData.length;
      
      const avgSatisfaction = totalSessions > 0
        ? sessionData.reduce((sum, s) => sum + (s.satisfaction_score || 0), 0) / totalSessions
        : 0;

      // Calculate improvement rate based on outcomes
      const sessionsWithOutcomes = sessionData.filter(s => s.outcomes && Object.keys(s.outcomes).length > 0);
      const improvementRate = totalSessions > 0
        ? (sessionsWithOutcomes.length / totalSessions) * 100
        : 0;

      // Calculate protocol adherence (sessions with interventions)
      const sessionsWithInterventions = sessionData.filter(s => s.interventions && s.interventions.length > 0);
      const protocolAdherence = totalSessions > 0
        ? (sessionsWithInterventions.length / totalSessions) * 100
        : 0;

      // Calculate patient retention (sessions in last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentSessionsCount = sessionData.filter(s => 
        new Date(s.created_at) > thirtyDaysAgo
      ).length;
      const patientRetention = totalSessions > 0
        ? (recentSessionsCount / totalSessions) * 100
        : 0;

      setMetrics({
        totalSessions,
        averageSatisfaction: avgSatisfaction,
        improvementRate,
        protocolAdherence,
        patientRetention
      });

    } catch (error: any) {
      console.error('Error fetching clinical data:', error);
      toast({
        title: "Error",
        description: "Failed to load clinical analytics",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getMetricColor = (value: number, threshold: number = 70) => {
    if (value >= threshold) return "text-green-600";
    if (value >= threshold - 20) return "text-yellow-600";
    return "text-red-600";
  };

  const getTrendIcon = (value: number, threshold: number = 70) => {
    if (value >= threshold) return TrendingUp;
    return TrendingDown;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Activity className="h-12 w-12 animate-pulse mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading clinical analytics...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="font-medium mb-2">Authentication Required</h3>
          <p className="text-muted-foreground">Please sign in to view clinical analytics</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Sessions</p>
                <p className="text-3xl font-bold">{metrics.totalSessions}</p>
                <Badge variant="outline" className="mt-2">
                  <Activity className="h-3 w-3 mr-1" />
                  Clinical Activity
                </Badge>
              </div>
              <Activity className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Avg. Satisfaction</p>
                <p className="text-3xl font-bold">{metrics.averageSatisfaction.toFixed(1)}/10</p>
                <div className="flex items-center gap-1 mt-2">
                  <Award className={`h-4 w-4 ${getMetricColor(metrics.averageSatisfaction * 10)}`} />
                  <span className={`text-sm ${getMetricColor(metrics.averageSatisfaction * 10)}`}>
                    {metrics.averageSatisfaction >= 7 ? 'Excellent' : metrics.averageSatisfaction >= 5 ? 'Good' : 'Needs Improvement'}
                  </span>
                </div>
              </div>
              <Award className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Improvement Rate</p>
                <p className="text-3xl font-bold">{metrics.improvementRate.toFixed(0)}%</p>
                <div className="flex items-center gap-1 mt-2">
                  {(() => {
                    const TrendIcon = getTrendIcon(metrics.improvementRate);
                    return <TrendIcon className={`h-4 w-4 ${getMetricColor(metrics.improvementRate)}`} />;
                  })()}
                  <span className={`text-sm ${getMetricColor(metrics.improvementRate)}`}>
                    Outcome Tracking
                  </span>
                </div>
              </div>
              <Target className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Protocol Adherence</p>
                <p className="text-3xl font-bold">{metrics.protocolAdherence.toFixed(0)}%</p>
                <div className="flex items-center gap-1 mt-2">
                  <CheckCircle className={`h-4 w-4 ${getMetricColor(metrics.protocolAdherence)}`} />
                  <span className={`text-sm ${getMetricColor(metrics.protocolAdherence)}`}>
                    Treatment Fidelity
                  </span>
                </div>
              </div>
              <CheckCircle className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Patient Outcomes Summary
            </CardTitle>
            <CardDescription>
              Track patient progress and treatment effectiveness
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Improvement Rate</span>
                <span className="text-sm text-muted-foreground">{metrics.improvementRate.toFixed(0)}%</span>
              </div>
              <Progress value={metrics.improvementRate} className="h-2" />
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Patient Retention</span>
                <span className="text-sm text-muted-foreground">{metrics.patientRetention.toFixed(0)}%</span>
              </div>
              <Progress value={metrics.patientRetention} className="h-2" />
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Protocol Adherence</span>
                <span className="text-sm text-muted-foreground">{metrics.protocolAdherence.toFixed(0)}%</span>
              </div>
              <Progress value={metrics.protocolAdherence} className="h-2" />
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">Patient Satisfaction</span>
                <span className="text-sm text-muted-foreground">{(metrics.averageSatisfaction * 10).toFixed(0)}%</span>
              </div>
              <Progress value={metrics.averageSatisfaction * 10} className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Treatment Effectiveness
            </CardTitle>
            <CardDescription>
              Monitor protocol success rates and patient outcomes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium">Successful Outcomes</p>
                    <p className="text-sm text-muted-foreground">Sessions with positive results</p>
                  </div>
                </div>
                <span className="text-2xl font-bold">{metrics.improvementRate.toFixed(0)}%</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <Target className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium">Protocol Compliance</p>
                    <p className="text-sm text-muted-foreground">Evidence-based interventions</p>
                  </div>
                </div>
                <span className="text-2xl font-bold">{metrics.protocolAdherence.toFixed(0)}%</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <Award className="h-5 w-5 text-yellow-600" />
                  <div>
                    <p className="font-medium">Patient Satisfaction</p>
                    <p className="text-sm text-muted-foreground">Average rating score</p>
                  </div>
                </div>
                <span className="text-2xl font-bold">{metrics.averageSatisfaction.toFixed(1)}/10</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Recent Clinical Sessions
          </CardTitle>
          <CardDescription>
            Your latest patient sessions and outcomes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentSessions.length > 0 ? (
            <div className="space-y-3">
              {recentSessions.map((session) => (
                <div key={session.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0">
                      <Activity className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium capitalize">{session.session_type}</p>
                      <p className="text-sm text-muted-foreground">
                        {session.duration_minutes || 0} minutes • {new Date(session.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {session.satisfaction_score && (
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Satisfaction</p>
                        <p className="font-bold">{session.satisfaction_score}/10</p>
                      </div>
                    )}
                    {session.outcomes && Object.keys(session.outcomes).length > 0 ? (
                      <Badge variant="default">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Tracked
                      </Badge>
                    ) : (
                      <Badge variant="outline">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Pending
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-medium mb-2">No Sessions Yet</h3>
              <p className="text-muted-foreground text-sm">
                Clinical session data will appear here as you track patient outcomes
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
