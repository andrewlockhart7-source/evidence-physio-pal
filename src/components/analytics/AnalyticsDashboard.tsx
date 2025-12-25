import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/Header";
import { ClinicalAnalytics } from "./ClinicalAnalytics";
import {
  TrendingUp,
  Users,
  FileText,
  Activity,
  BarChart3,
  PieChart,
  Calendar,
  Target,
  Award,
  Clock,
  CheckCircle,
  AlertCircle
} from "lucide-react";

interface AnalyticsSummary {
  totalPatients: number;
  activeProtocols: number;
  completedSessions: number;
  cpdHours: number;
  averageRating: number;
  protocolsShared: number;
  reviewsReceived: number;
  evidenceAccessed: number;
}

interface UsageMetrics {
  dailyLogins: number[];
  featuresUsed: { [key: string]: number };
  protocolsCreated: number;
  assessmentsCompleted: number;
  collaborationActivity: number;
}

export const AnalyticsDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [analytics, setAnalytics] = useState<AnalyticsSummary>({
    totalPatients: 0,
    activeProtocols: 0,
    completedSessions: 0,
    cpdHours: 0,
    averageRating: 0,
    protocolsShared: 0,
    reviewsReceived: 0,
    evidenceAccessed: 0
  });
  
  const [usage, setUsage] = useState<UsageMetrics>({
    dailyLogins: [],
    featuresUsed: {},
    protocolsCreated: 0,
    assessmentsCompleted: 0,
    collaborationActivity: 0
  });
  
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');

  useEffect(() => {
    if (user) {
      fetchAnalytics();
    }
  }, [user, timeRange]);

  const fetchAnalytics = async () => {
    try {
      console.log("📊 AnalyticsDashboard: Starting to fetch analytics data for user:", user?.id);
      
      // Fetch basic counts with proper error handling
      const fetchQueries = async () => {
        const queries = [
          supabase.from('treatment_protocols').select('id', { count: 'exact' }).eq('created_by', user?.id || ''),
          supabase.from('analytics_sessions').select('id', { count: 'exact' }).eq('user_id', user?.id || ''),
          supabase.from('cpd_activities').select('hours_claimed').eq('user_id', user?.id || ''),
          supabase.from('collaboration_shared_protocols').select('id', { count: 'exact' }).eq('shared_by', user?.id || ''),
          supabase.from('protocol_reviews').select('rating').eq('reviewer_id', user?.id || '')
        ];

        const results = await Promise.allSettled(queries);
        
        return results.map((result, index) => {
          if (result.status === 'fulfilled') {
            console.log(`📊 Query ${index} successful:`, result.value);
            return result.value;
          } else {
            console.warn(`📊 Query ${index} failed:`, result.reason);
            return { data: null, count: 0, error: result.reason };
          }
        });
      };

      const [
        protocolsResult,
        sessionsResult,
        cpdResult,
        sharedResult,
        reviewsResult
      ] = await fetchQueries();

      const totalCpdHours = cpdResult.data?.reduce((sum: number, activity: any) => sum + Number(activity.hours_claimed || 0), 0) || 0;
      const avgRating = (reviewsResult.data?.length || 0) > 0 
        ? (reviewsResult.data || []).reduce((sum: number, review: any) => sum + Number(review.rating || 0), 0) / (reviewsResult.data?.length || 1)
        : 0;

      // Now fetch evidence access data from the new table
      const evidenceResult = await supabase
        .from('evidence_access_logs')
        .select('id', { count: 'exact' })
        .eq('user_id', user?.id || '');

      // Fetch activity stats for feature usage
      const activityResult = await supabase
        .from('user_activity_stats')
        .select('*')
        .eq('user_id', user?.id || '')
        .order('activity_date', { ascending: false })
        .limit(30);

      console.log("📊 AnalyticsDashboard: Evidence access count:", evidenceResult.count);
      console.log("📊 AnalyticsDashboard: Activity stats:", activityResult.data?.length);

      // Calculate feature usage from activity stats
      const featureUsage = activityResult.data?.reduce((acc, stat) => {
        acc['Patient Management'] = (acc['Patient Management'] || 0) + (stat.collaboration_interactions || 0);
        acc['Protocol Builder'] = (acc['Protocol Builder'] || 0) + (stat.protocols_created || 0);
        acc['Evidence Search'] = (acc['Evidence Search'] || 0) + (stat.evidence_searches || 0);
        acc['Assessment Tools'] = (acc['Assessment Tools'] || 0) + (stat.assessments_completed || 0);
        acc['CPD Tracker'] = (acc['CPD Tracker'] || 0) + (stat.cpd_activities || 0);
        acc['Collaboration'] = (acc['Collaboration'] || 0) + (stat.protocols_shared || 0);
        return acc;
      }, {} as { [key: string]: number }) || {};

      const analyticsData = {
        totalPatients: 0, // Patient management removed
        activeProtocols: protocolsResult.count || 0,
        completedSessions: sessionsResult.count || 0,
        cpdHours: totalCpdHours,
        averageRating: avgRating,
        protocolsShared: sharedResult.count || 0,
        reviewsReceived: reviewsResult.data?.length || 0,
        evidenceAccessed: evidenceResult.count || 0 // Now using real data
      };

      console.log("📊 AnalyticsDashboard: Final analytics data:", analyticsData);
      setAnalytics(analyticsData);

      // Update usage metrics with real data
      const usageData = {
        dailyLogins: activityResult.data?.map(stat => stat.logins_count || 0).slice(0, 30) || [],
        featuresUsed: featureUsage,
        protocolsCreated: protocolsResult.count || 0,
        assessmentsCompleted: activityResult.data?.reduce((sum, stat) => sum + (stat.assessments_completed || 0), 0) || 0,
        collaborationActivity: sharedResult.count || 0
      };

      console.log("📊 AnalyticsDashboard: Usage data:", usageData);
      setUsage(usageData);

    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch analytics data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getProfileCompleteness = () => {
    // Calculate profile completeness based on various factors
    let completeness = 0;
    const maxScore = 100;
    
    if (analytics.totalPatients > 0) completeness += 20;
    if (analytics.activeProtocols > 0) completeness += 20;
    if (analytics.cpdHours > 0) completeness += 15;
    if (analytics.protocolsShared > 0) completeness += 15;
    if (analytics.reviewsReceived > 0) completeness += 15;
    if (analytics.evidenceAccessed > 10) completeness += 15;
    
    return Math.min(completeness, maxScore);
  };

  const getEngagementLevel = () => {
    const totalActivity = analytics.totalPatients + analytics.activeProtocols + 
                         analytics.protocolsShared + analytics.reviewsReceived;
    
    if (totalActivity >= 20) return { level: 'Expert', color: 'text-purple-600', icon: Award };
    if (totalActivity >= 10) return { level: 'Advanced', color: 'text-blue-600', icon: Target };
    if (totalActivity >= 5) return { level: 'Intermediate', color: 'text-green-600', icon: CheckCircle };
    return { level: 'Beginner', color: 'text-yellow-600', icon: Clock };
  };

  const profileCompleteness = getProfileCompleteness();
  const engagement = getEngagementLevel();
  const EngagementIcon = engagement.icon;

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading analytics...</div>;
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Analytics Dashboard</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Track your clinical practice, monitor engagement, and measure your contribution to evidence-based care.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Profile Complete</p>
                <p className="text-2xl font-bold">{profileCompleteness}%</p>
              </div>
              <div className="text-right">
                <Progress value={profileCompleteness} className="w-16 h-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Engagement Level</p>
                <p className={`text-lg font-bold ${engagement.color}`}>{engagement.level}</p>
              </div>
              <EngagementIcon className={`h-8 w-8 ${engagement.color}`} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">CPD Hours</p>
                <p className="text-2xl font-bold">{analytics.cpdHours}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg. Rating</p>
                <p className="text-2xl font-bold">{analytics.averageRating.toFixed(1)}</p>
              </div>
              <Award className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <div className="flex justify-between items-center">
        <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="clinical">Clinical</TabsTrigger>
            <TabsTrigger value="engagement">Engagement</TabsTrigger>
            <TabsTrigger value="professional">Professional</TabsTrigger>
          </TabsList>
          
          <div className="flex gap-2">
            <Button
              variant={timeRange === '7d' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange('7d')}
            >
              7 Days
            </Button>
            <Button
              variant={timeRange === '30d' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange('30d')}
            >
              30 Days
            </Button>
            <Button
              variant={timeRange === '90d' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange('90d')}
            >
              90 Days
            </Button>
          </div>
        </div>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="h-5 w-5" />
                  Patient Care
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Total Patients</span>
                    <span className="font-medium">{analytics.totalPatients}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Sessions Completed</span>
                    <span className="font-medium">{analytics.completedSessions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Avg. Sessions/Patient</span>
                    <span className="font-medium">
                      {analytics.totalPatients > 0 
                        ? (analytics.completedSessions / analytics.totalPatients).toFixed(1)
                        : '0'
                      }
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="h-5 w-5" />
                  Protocol Development
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Protocols Created</span>
                    <span className="font-medium">{analytics.activeProtocols}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Protocols Shared</span>
                    <span className="font-medium">{analytics.protocolsShared}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Reviews Received</span>
                    <span className="font-medium">{analytics.reviewsReceived}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BarChart3 className="h-5 w-5" />
                  Evidence Usage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Articles Accessed</span>
                    <span className="font-medium">{analytics.evidenceAccessed}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Feature Usage Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Feature Usage
              </CardTitle>
              <CardDescription>
                Most frequently used platform features
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(usage.featuresUsed).map(([feature, count]) => {
                  const maxUsage = Math.max(...Object.values(usage.featuresUsed));
                  const percentage = (count / maxUsage) * 100;
                  
                  return (
                    <div key={feature} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{feature}</span>
                        <span>{count} uses</span>
                      </div>
                      <Progress value={percentage} className="h-2" />
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clinical" className="space-y-4">
          <ClinicalAnalytics />
        </TabsContent>

        <TabsContent value="engagement" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Platform Engagement</CardTitle>
              <CardDescription>
                Your activity and contribution to the community
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-2">
                    {analytics.protocolsShared}
                  </div>
                  <p className="text-sm text-muted-foreground">Protocols Shared</p>
                </div>
                
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600 mb-2">
                    {analytics.reviewsReceived}
                  </div>
                  <p className="text-sm text-muted-foreground">Peer Reviews</p>
                </div>
                
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600 mb-2">
                    {Math.floor(analytics.evidenceAccessed / 7)}
                  </div>
                  <p className="text-sm text-muted-foreground">Weekly Evidence Views</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="professional" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>CPD Progress</CardTitle>
                <CardDescription>
                  Track your continuing professional development
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Hours Completed</span>
                    <span className="font-medium">{analytics.cpdHours}</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Annual Target</span>
                    <span className="font-medium">20 hours</span>
                  </div>
                  
                  <Progress value={(analytics.cpdHours / 20) * 100} className="h-3" />
                  
                  <p className="text-xs text-muted-foreground">
                    {20 - analytics.cpdHours > 0 
                      ? `${20 - analytics.cpdHours} hours remaining to meet annual target`
                      : 'Annual target achieved! 🎉'
                    }
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Professional Recognition</CardTitle>
                <CardDescription>
                  Achievements and peer recognition
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Award className="h-5 w-5 text-yellow-500" />
                    <div>
                      <p className="font-medium text-sm">Evidence Champion</p>
                      <p className="text-xs text-muted-foreground">
                        {analytics.evidenceAccessed > 50 ? 'Achieved' : 'In Progress'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="font-medium text-sm">Collaboration Leader</p>
                      <p className="text-xs text-muted-foreground">
                        {analytics.protocolsShared > 3 ? 'Achieved' : 'In Progress'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="font-medium text-sm">Quality Contributor</p>
                      <p className="text-xs text-muted-foreground">
                        {analytics.averageRating > 4 ? 'Achieved' : 'In Progress'}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
        </div>
      </main>
    </div>
  );
};