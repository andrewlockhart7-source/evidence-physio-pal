import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, TrendingUp, Users, Clock, Target, Award, CheckCircle } from "lucide-react";
import { PremiumFeature } from "@/components/subscription/PremiumFeature";
import { AddSessionForm } from "./AddSessionForm";

interface AnalyticsData {
  totalSessions: number;
  averageSessionDuration: number;
  patientSatisfaction: number;
  conditionBreakdown: { [key: string]: number };
  monthlyTrends: { month: string; sessions: number; satisfaction: number }[];
  interventionEffectiveness: { intervention: string; successRate: number }[];
}

export const EnhancedAnalytics = () => {
  const { user } = useAuth();
  const { subscribed } = useSubscription();
  const { toast } = useToast();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('3_months');

  useEffect(() => {
    if (user && subscribed) {
      fetchAnalyticsData();
    } else {
      setLoading(false);
    }
  }, [user, subscribed, timeRange]);

  const fetchAnalyticsData = async () => {
    if (!user) {
      console.log("📊 EnhancedAnalytics: No user available");
      return;
    }

    try {
      setLoading(true);
      console.log("📊 EnhancedAnalytics: Starting to fetch analytics data for user:", user.id);

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      switch (timeRange) {
        case '1_month':
          startDate.setMonth(endDate.getMonth() - 1);
          break;
        case '3_months':
          startDate.setMonth(endDate.getMonth() - 3);
          break;
        case '6_months':
          startDate.setMonth(endDate.getMonth() - 6);
          break;
        case '1_year':
          startDate.setFullYear(endDate.getFullYear() - 1);
          break;
      }

      console.log("📊 EnhancedAnalytics: Date range:", { startDate: startDate.toISOString(), endDate: endDate.toISOString() });

      // Fetch analytics sessions - simplified query to avoid JOIN issues
      const { data: sessions, error } = await supabase
        .from('analytics_sessions')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error("📊 EnhancedAnalytics: Database error:", error);
        throw error;
      }

      console.log("📊 EnhancedAnalytics: Fetched sessions:", sessions?.length || 0);

      // Process analytics data
      const processedData = processAnalyticsData(sessions || []);
      console.log("📊 EnhancedAnalytics: Processed data:", processedData);
      setAnalyticsData(processedData);
    } catch (error: any) {
      console.error('Error fetching analytics:', error);
      toast({
        title: "Error",
        description: "Failed to load analytics data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const processAnalyticsData = (sessions: any[]): AnalyticsData => {
    const totalSessions = sessions.length;
    
    const averageSessionDuration = sessions.reduce((acc, session) => 
      acc + (session.duration_minutes || 0), 0) / Math.max(totalSessions, 1);
    
    const satisfactionScores = sessions.filter(s => s.satisfaction_score);
    const patientSatisfaction = satisfactionScores.reduce((acc, session) => 
      acc + session.satisfaction_score, 0) / Math.max(satisfactionScores.length, 1);

    // Condition breakdown - get from session_type field or default naming
    const conditionBreakdown: { [key: string]: number } = {};
    sessions.forEach(session => {
      const condition = session.session_type || 'General Session';
      conditionBreakdown[condition] = (conditionBreakdown[condition] || 0) + 1;
    });

    // Monthly trends
    const monthlyData: { [key: string]: { sessions: number; satisfaction: number; count: number } } = {};
    sessions.forEach(session => {
      const month = new Date(session.created_at).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short' 
      });
      if (!monthlyData[month]) {
        monthlyData[month] = { sessions: 0, satisfaction: 0, count: 0 };
      }
      monthlyData[month].sessions += 1;
      if (session.satisfaction_score) {
        monthlyData[month].satisfaction += session.satisfaction_score;
        monthlyData[month].count += 1;
      }
    });

    const monthlyTrends = Object.entries(monthlyData).map(([month, data]) => ({
      month,
      sessions: data.sessions,
      satisfaction: data.count > 0 ? data.satisfaction / data.count : 0
    }));

    // Intervention effectiveness
    const interventionData: { [key: string]: { total: number; successful: number } } = {};
    sessions.forEach(session => {
      if (session.interventions && Array.isArray(session.interventions)) {
        session.interventions.forEach((intervention: string) => {
          if (!interventionData[intervention]) {
            interventionData[intervention] = { total: 0, successful: 0 };
          }
          interventionData[intervention].total += 1;
          // Consider satisfaction >= 7 as successful
          if (session.satisfaction_score >= 7) {
            interventionData[intervention].successful += 1;
          }
        });
      }
    });

    const interventionEffectiveness = Object.entries(interventionData)
      .map(([intervention, data]) => ({
        intervention,
        successRate: data.total > 0 ? (data.successful / data.total) * 100 : 0
      }))
      .sort((a, b) => b.successRate - a.successRate)
      .slice(0, 10);

    return {
      totalSessions,
      averageSessionDuration,
      patientSatisfaction,
      conditionBreakdown,
      monthlyTrends,
      interventionEffectiveness
    };
  };

  if (!subscribed) {
    return (
      <PremiumFeature feature="advanced practice analytics" showUpgrade={true}>
        <div className="text-center py-8">
          <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">Advanced Practice Analytics</h3>
          <p className="text-muted-foreground mb-4">
            Track patient outcomes, intervention effectiveness, and practice trends
          </p>
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <CheckCircle className="h-4 w-4" />
              <span>Real-time session tracking</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <CheckCircle className="h-4 w-4" />
              <span>Intervention effectiveness analysis</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <CheckCircle className="h-4 w-4" />
              <span>Patient outcome reporting</span>
            </div>
          </div>
        </div>
      </PremiumFeature>
    );
  }

  return (
    <div className="space-y-6">
      {/* Add Session Form */}
      <AddSessionForm />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Practice Analytics
              </CardTitle>
              <CardDescription>
                Track your practice performance and patient outcomes
              </CardDescription>
            </div>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1_month">Last Month</SelectItem>
                <SelectItem value="3_months">Last 3 Months</SelectItem>
                <SelectItem value="6_months">Last 6 Months</SelectItem>
                <SelectItem value="1_year">Last Year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="h-4 bg-muted rounded"></div>
                  <div className="h-8 bg-muted rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : analyticsData ? (
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Sessions</p>
                    <p className="text-2xl font-bold">{analyticsData.totalSessions}</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Avg Session Duration</p>
                    <p className="text-2xl font-bold">{Math.round(analyticsData.averageSessionDuration)}m</p>
                  </div>
                  <Clock className="h-8 w-8 text-green-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Patient Satisfaction</p>
                    <p className="text-2xl font-bold">{analyticsData.patientSatisfaction.toFixed(1)}/10</p>
                  </div>
                  <Award className="h-8 w-8 text-yellow-500" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Top Condition</p>
                    <p className="text-sm font-bold">
                      {Object.entries(analyticsData.conditionBreakdown).length > 0 
                        ? Object.entries(analyticsData.conditionBreakdown)
                            .sort(([,a], [,b]) => b - a)[0][0]
                        : 'No data'
                      }
                    </p>
                  </div>
                  <Target className="h-8 w-8 text-purple-500" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Condition Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Condition Breakdown</CardTitle>
              <CardDescription>Distribution of treated conditions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(analyticsData.conditionBreakdown)
                  .sort(([,a], [,b]) => b - a)
                  .slice(0, 10)
                  .map(([condition, count]) => (
                    <div key={condition} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{condition}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary"
                            style={{ 
                              width: `${(count / analyticsData.totalSessions) * 100}%` 
                            }}
                          />
                        </div>
                        <Badge variant="outline">{count}</Badge>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          {/* Intervention Effectiveness */}
          {analyticsData.interventionEffectiveness.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Intervention Effectiveness</CardTitle>
                <CardDescription>Success rates based on patient satisfaction ≥7/10</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analyticsData.interventionEffectiveness.map((item) => (
                    <div key={item.intervention} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{item.intervention}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-green-500"
                            style={{ width: `${item.successRate}%` }}
                          />
                        </div>
                        <Badge variant="outline">{Math.round(item.successRate)}%</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-8">
            <BarChart3 className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-muted-foreground">No analytics data available</p>
            <p className="text-sm text-muted-foreground">
              Start tracking patient sessions to see insights here
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};