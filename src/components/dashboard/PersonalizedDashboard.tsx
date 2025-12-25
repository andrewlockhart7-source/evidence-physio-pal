import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { getExternalEvidenceLink } from "@/utils/evidenceLinks";
import { Header } from "@/components/Header";
import {
  Calendar,
  TrendingUp,
  BookOpen,
  Users,
  Award,
  Clock,
  Heart,
  Target,
  BarChart3,
  Bell,
  Star,
  CheckCircle,
  Edit,
  Save,
  ExternalLink
} from "lucide-react";

interface DashboardData {
  recentEvidence: any[];
  savedProtocols: any[];
  cpdProgress: any;
  notifications: any[];
  favoriteConditions: string[];
  evidenceReviewsCount: number;
  peerReviewsCount: number;
}

interface CPDRecord {
  id: string;
  activity_type: string;
  title: string;
  date: string;
  hours: number;
  category: string;
  status: 'completed' | 'in_progress' | 'planned';
}

export const PersonalizedDashboard = () => {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData>({
    recentEvidence: [],
    savedProtocols: [],
    cpdProgress: null,
    notifications: [],
    favoriteConditions: [],
    evidenceReviewsCount: 0,
    peerReviewsCount: 0
  });
  const [cpdRecords, setCpdRecords] = useState<CPDRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [editingProtocol, setEditingProtocol] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    duration_weeks: 0,
    frequency_per_week: 0,
    expected_outcomes: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchDashboardData();
      fetchCPDRecords();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      // Fetch user preferences
      const { data: preferences } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user?.id || '')
        .single();

      // Fetch recent evidence based on user's preferred conditions
      const { data: evidence } = await supabase
        .from('evidence')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      // Fetch user's saved protocols
      const { data: protocols } = await supabase
        .from('treatment_protocols')
        .select('*')
        .eq('created_by', user?.id || '')
        .order('created_at', { ascending: false })
        .limit(3);

      // Fetch CPD progress from actual records
      const { data: cpdActivities } = await supabase
        .from('cpd_activities')
        .select('hours_claimed')
        .eq('user_id', user?.id || '');

      const completedHours = cpdActivities?.reduce((sum, activity) => 
        sum + Number(activity.hours_claimed), 0) || 0;

      // Fetch recent notifications
      const { data: notifications } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user?.id || '')
        .order('created_at', { ascending: false })
        .limit(3);

      // Fetch evidence reviews count
      const { data: evidenceReviews } = await supabase
        .from('evidence_access_logs')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user?.id || '');

      // Fetch peer reviews count (reviews I've written)
      const { data: peerReviews } = await supabase
        .from('protocol_reviews')
        .select('id', { count: 'exact', head: true })
        .eq('reviewer_id', user?.id || '');

      setDashboardData({
        recentEvidence: evidence || [],
        savedProtocols: protocols || [],
        cpdProgress: {
          completed: completedHours,
          required: 40, // Standard annual requirement
          deadline: '2024-12-31'
        },
        notifications: (notifications || []).map(n => ({
          id: n.id,
          type: n.type,
          message: n.message,
          time: new Date(n.created_at).toLocaleDateString()
        })),
        favoriteConditions: preferences?.preferred_conditions || [],
        evidenceReviewsCount: evidenceReviews?.length || 0,
        peerReviewsCount: peerReviews?.length || 0
      });

    } catch (error: any) {
      toast({
        title: "Error loading dashboard",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCPDRecords = async () => {
    try {
      const { data: cpdActivities, error } = await supabase
        .from('cpd_activities')
        .select('*')
        .eq('user_id', user?.id || '')
        .order('date_completed', { ascending: false })
        .limit(10);

      if (error) throw error;

      // Transform database records to match the CPDRecord interface
      const transformedRecords: CPDRecord[] = (cpdActivities || []).map(activity => ({
        id: activity.id,
        activity_type: activity.activity_type,
        title: activity.title,
        date: activity.date_completed,
        hours: Number(activity.hours_claimed),
        category: activity.activity_type,
        status: 'completed' as const // All records in the table are completed
      }));

      setCpdRecords(transformedRecords);
    } catch (error: any) {
      console.error('Error fetching CPD records:', error);
      setCpdRecords([]);
    }
  };

  const handleEditProtocol = (protocol: any) => {
    setEditingProtocol(protocol);
    setEditForm({
      name: protocol.name || '',
      description: protocol.description || '',
      duration_weeks: protocol.duration_weeks || 0,
      frequency_per_week: protocol.frequency_per_week || 0,
      expected_outcomes: protocol.expected_outcomes || ''
    });
  };

  const handleSaveProtocol = async () => {
    if (!editingProtocol) return;

    try {
      const { error } = await supabase
        .from('treatment_protocols')
        .update({
          name: editForm.name,
          description: editForm.description,
          duration_weeks: editForm.duration_weeks,
          frequency_per_week: editForm.frequency_per_week,
          expected_outcomes: editForm.expected_outcomes,
          updated_at: new Date().toISOString()
        })
        .eq('id', editingProtocol.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Protocol updated successfully",
      });

      setEditingProtocol(null);
      fetchDashboardData(); // Refresh the data
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update protocol",
        variant: "destructive",
      });
    }
  };

  const QuickStatsCard = ({ icon: Icon, title, value, trend, color }: any) => (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-md ${color}`}>
              <Icon className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{title}</p>
              <p className="text-2xl font-bold">{value}</p>
            </div>
          </div>
          {trend && (
            <Badge variant={trend > 0 ? "default" : "secondary"}>
              {trend > 0 ? '+' : ''}{trend}%
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const RecentEvidenceCard = ({ evidence }: { evidence: any }) => {
    // Determine the best external link for the evidence
    const getEvidenceLink = () => getExternalEvidenceLink(evidence) || '#';

    const externalLink = getEvidenceLink();

    return (
      <Card className="mb-3 hover:shadow-md transition-shadow border-l-4 border-l-primary/20">
        <CardContent className="p-4">
          <div className="space-y-3">
            <div className="flex justify-between items-start gap-3">
              <div className="flex-1">
                {externalLink ? (
                  <a href={externalLink} target="_blank" rel="noopener noreferrer" className="hover:underline focus:underline focus:outline-none">
                    <h4 className="font-medium text-sm line-clamp-2 mb-1 text-primary">{evidence.title}</h4>
                  </a>
                ) : (
                  <h4 className="font-medium text-sm line-clamp-2 mb-1">{evidence.title}</h4>
                )}
                <p className="text-xs text-muted-foreground">{evidence.journal}</p>
              </div>
              <Badge variant="outline" className="shrink-0">
                {evidence.evidence_level}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>{new Date(evidence.publication_date).toLocaleDateString()}</span>
              </div>
              
              {externalLink && (
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                  className="h-8"
                >
                  <a 
                    href={externalLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="gap-1"
                  >
                    <ExternalLink className="h-3 w-3" />
                    View Article
                  </a>
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const CPDProgressCard = () => {
    const progress = dashboardData.cpdProgress;
    if (!progress) return null;

    const percentage = (progress.completed / progress.required) * 100;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            CPD Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Completed</span>
              <span>{progress.completed}/{progress.required} hours</span>
            </div>
            <Progress value={percentage} className="h-2" />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-primary">{progress.completed}</div>
              <div className="text-xs text-muted-foreground">Hours Completed</div>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-orange-500">{progress.required - progress.completed}</div>
              <div className="text-xs text-muted-foreground">Hours Remaining</div>
            </div>
          </div>

          <div className="space-y-2">
            {cpdRecords.slice(0, 3).map(record => (
              <div key={record.id} className="flex items-center justify-between p-2 border rounded">
                <div>
                  <p className="font-medium text-sm">{record.title}</p>
                  <p className="text-xs text-muted-foreground">{record.hours} hours • {record.category}</p>
                </div>
                <Badge variant={
                  record.status === 'completed' ? 'default' : 
                  record.status === 'in_progress' ? 'secondary' : 'outline'
                }>
                  {record.status.replace('_', ' ')}
                </Badge>
              </div>
            ))}
          </div>

          <Button variant="outline" className="w-full" asChild>
            <Link to="/cpd">
              <BookOpen className="h-4 w-4 mr-2" />
              View All CPD Records
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Welcome back, {user?.user_metadata?.first_name || 'Professional'}</h1>
          <p className="text-muted-foreground">Here's your personalized evidence and progress overview</p>
        </div>
        <Sheet open={notificationsOpen} onOpenChange={setNotificationsOpen}>
          <SheetTrigger asChild>
            <Button>
              <Bell className="h-4 w-4 mr-2" />
              Notifications ({dashboardData.notifications.length})
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Notifications</SheetTitle>
            </SheetHeader>
            <div className="mt-6 space-y-3">
              {dashboardData.notifications.length > 0 ? (
                dashboardData.notifications.map(notification => (
                  <div key={notification.id} className="flex items-start gap-3 p-3 border rounded">
                    <div className="mt-1">
                      {notification.type === 'evidence' && <BookOpen className="h-4 w-4 text-blue-500" />}
                      {notification.type === 'protocol' && <CheckCircle className="h-4 w-4 text-green-500" />}
                      {notification.type === 'cpd' && <Clock className="h-4 w-4 text-orange-500" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm">{notification.message}</p>
                      <p className="text-xs text-muted-foreground">{notification.time}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-8">No notifications</p>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <QuickStatsCard
          icon={BookOpen}
          title="Evidence Reviews"
          value={dashboardData.evidenceReviewsCount}
          trend={null}
          color="bg-blue-500"
        />
        <QuickStatsCard
          icon={Users}
          title="Protocols Created"
          value={dashboardData.savedProtocols.length}
          trend={null}
          color="bg-green-500"
        />
        <QuickStatsCard
          icon={Award}
          title="CPD Hours"
          value={dashboardData.cpdProgress?.completed || 0}
          trend={null}
          color="bg-purple-500"
        />
        <QuickStatsCard
          icon={Star}
          title="Peer Reviews"
          value={dashboardData.peerReviewsCount}
          trend={null}
          color="bg-orange-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Evidence */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Recent Evidence
              </CardTitle>
              <CardDescription>
                Latest research relevant to your practice areas
              </CardDescription>
            </CardHeader>
            <CardContent>
              {dashboardData.recentEvidence.length > 0 ? (
                <div className="space-y-3">
                  {dashboardData.recentEvidence.map(evidence => (
                    <RecentEvidenceCard key={evidence.id} evidence={evidence} />
                  ))}
                  <Button variant="outline" className="w-full" asChild>
                    <Link to="/evidence">
                      View All Evidence
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No recent evidence available</p>
                  <Button variant="outline" className="mt-2" asChild>
                    <Link to="/evidence">Browse Evidence Library</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* CPD Progress */}
        <div>
          <CPDProgressCard />
        </div>
      </div>

      {/* My Protocols & Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              My Treatment Protocols
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dashboardData.savedProtocols.length > 0 ? (
              <div className="space-y-3">
                {dashboardData.savedProtocols.map(protocol => (
                  <div key={protocol.id} className="flex items-center justify-between p-3 border rounded hover:bg-accent/50 transition-colors group">
                    <div className="flex-1">
                      <h4 className="font-medium">{protocol.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {protocol.duration_weeks} weeks • {protocol.frequency_per_week}x/week
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={protocol.is_validated ? "default" : "secondary"}>
                        {protocol.is_validated ? "Validated" : "Draft"}
                      </Badge>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleEditProtocol(protocol)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                <Button variant="outline" className="w-full" asChild>
                  <Link to="/protocols">
                    Create New Protocol
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="text-center py-8">
                <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-2">No protocols created yet</p>
                <Button asChild>
                  <Link to="/protocols">
                    <Target className="h-4 w-4 mr-2" />
                    Create First Protocol
                  </Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Recent Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dashboardData.notifications.map(notification => (
                <div key={notification.id} className="flex items-start gap-3 p-3 border rounded">
                  <div className="mt-1">
                    {notification.type === 'evidence' && <BookOpen className="h-4 w-4 text-blue-500" />}
                    {notification.type === 'protocol' && <CheckCircle className="h-4 w-4 text-green-500" />}
                    {notification.type === 'cpd' && <Clock className="h-4 w-4 text-orange-500" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm">{notification.message}</p>
                    <p className="text-xs text-muted-foreground">{notification.time}</p>
                  </div>
                </div>
              ))}
              {dashboardData.notifications.length > 0 && (
                <Button variant="outline" className="w-full" onClick={() => setNotificationsOpen(true)}>
                  View All Notifications
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit Protocol Dialog */}
      <Dialog open={!!editingProtocol} onOpenChange={() => setEditingProtocol(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Protocol</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Protocol Name</Label>
              <Input
                id="name"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                placeholder="Enter protocol name"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={editForm.description}
                onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                placeholder="Enter protocol description"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (weeks)</Label>
                <Input
                  id="duration"
                  type="number"
                  value={editForm.duration_weeks}
                  onChange={(e) => setEditForm({ ...editForm, duration_weeks: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="frequency">Frequency (per week)</Label>
                <Input
                  id="frequency"
                  type="number"
                  value={editForm.frequency_per_week}
                  onChange={(e) => setEditForm({ ...editForm, frequency_per_week: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="outcomes">Expected Outcomes</Label>
              <Textarea
                id="outcomes"
                value={editForm.expected_outcomes}
                onChange={(e) => setEditForm({ ...editForm, expected_outcomes: e.target.value })}
                placeholder="Enter expected outcomes"
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setEditingProtocol(null)}>
                Cancel
              </Button>
              <Button onClick={handleSaveProtocol}>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
        </div>
      </main>
    </div>
  );
};