import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Clock, Award, Plus, FileText, Calendar, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useActivityTracking } from "@/hooks/useActivityTracking";

interface CPDActivity {
  id: string;
  activity_type: string;
  title: string;
  description: string | null;
  provider: string | null;
  date_completed: string;
  hours_claimed: number;
  cpd_points: number | null;
  verification_method: string | null;
  certificate_url: string | null;
  notes: string | null;
}

export const CPDTracker = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { trackCPDActivity } = useActivityTracking();
  const [activities, setActivities] = useState<CPDActivity[]>([]);
  const [totalHours, setTotalHours] = useState(0);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const requiredHours = 20;

  // Form state
  const [formData, setFormData] = useState({
    activity_type: "course",
    title: "",
    description: "",
    provider: "",
    date_completed: "",
    hours_claimed: "",
    cpd_points: "",
    verification_method: "certificate",
    certificate_url: "",
    notes: ""
  });

  useEffect(() => {
    if (user) {
      fetchActivities();
    }
  }, [user]);

  const fetchActivities = async () => {
    try {
      const { data, error } = await supabase
        .from('cpd_activities')
        .select('*')
        .order('date_completed', { ascending: false });

      if (error) throw error;

      setActivities(data || []);
      
      // Calculate total hours
      const total = (data || []).reduce((sum, activity) => sum + Number(activity.hours_claimed), 0);
      setTotalHours(total);
    } catch (error) {
      console.error('Error fetching CPD activities:', error);
      toast({
        title: "Error",
        description: "Failed to load CPD activities",
        variant: "destructive"
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to add CPD activities",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('cpd_activities')
        .insert({
          user_id: user.id,
          activity_type: formData.activity_type,
          title: formData.title,
          description: formData.description || null,
          provider: formData.provider || null,
          date_completed: formData.date_completed,
          hours_claimed: parseFloat(formData.hours_claimed),
          cpd_points: formData.cpd_points ? parseFloat(formData.cpd_points) : null,
          verification_method: formData.verification_method || null,
          certificate_url: formData.certificate_url || null,
          notes: formData.notes || null
        });

      if (error) throw error;

      // Track CPD activity
      await trackCPDActivity();

      toast({
        title: "Success",
        description: "CPD activity added successfully"
      });

      // Reset form
      setFormData({
        activity_type: "course",
        title: "",
        description: "",
        provider: "",
        date_completed: "",
        hours_claimed: "",
        cpd_points: "",
        verification_method: "certificate",
        certificate_url: "",
        notes: ""
      });

      setIsDialogOpen(false);
      fetchActivities();
    } catch (error) {
      console.error('Error adding CPD activity:', error);
      toast({
        title: "Error",
        description: "Failed to add CPD activity",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('cpd_activities')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "CPD activity deleted"
      });

      fetchActivities();
    } catch (error) {
      console.error('Error deleting CPD activity:', error);
      toast({
        title: "Error",
        description: "Failed to delete CPD activity",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">CPD Activity Tracker</h1>
        <p className="text-muted-foreground">Track your continuing professional development activities.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hours Completed</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalHours.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">of {requiredHours} required hours</p>
            <Progress value={(totalHours / requiredHours) * 100} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">CPD Points</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {activities.reduce((sum, a) => sum + (Number(a.cpd_points) || 0), 0)}
            </div>
            <p className="text-xs text-muted-foreground">Points earned this year</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activities</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activities.length}</div>
            <p className="text-xs text-muted-foreground">Activities completed</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Add CPD Activity</CardTitle>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Activity
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add CPD Activity</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="activity_type">Activity Type</Label>
                      <Select
                        value={formData.activity_type}
                        onValueChange={(value) => setFormData({ ...formData, activity_type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="course">Course</SelectItem>
                          <SelectItem value="workshop">Workshop</SelectItem>
                          <SelectItem value="conference">Conference</SelectItem>
                          <SelectItem value="webinar">Webinar</SelectItem>
                          <SelectItem value="reading">Reading</SelectItem>
                          <SelectItem value="research">Research</SelectItem>
                          <SelectItem value="mentoring">Mentoring</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="date_completed">Date Completed</Label>
                      <Input
                        id="date_completed"
                        type="date"
                        value={formData.date_completed}
                        onChange={(e) => setFormData({ ...formData, date_completed: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="title">Title</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="e.g., Advanced Manual Therapy Course"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Describe what you learned..."
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="provider">Provider</Label>
                      <Input
                        id="provider"
                        value={formData.provider}
                        onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                        placeholder="e.g., CSP, MACP"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="verification_method">Verification Method</Label>
                      <Select
                        value={formData.verification_method}
                        onValueChange={(value) => setFormData({ ...formData, verification_method: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="certificate">Certificate</SelectItem>
                          <SelectItem value="attendance">Attendance Record</SelectItem>
                          <SelectItem value="self_declaration">Self Declaration</SelectItem>
                          <SelectItem value="peer_review">Peer Review</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="hours_claimed">Hours Claimed</Label>
                      <Input
                        id="hours_claimed"
                        type="number"
                        step="0.5"
                        min="0"
                        value={formData.hours_claimed}
                        onChange={(e) => setFormData({ ...formData, hours_claimed: e.target.value })}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="cpd_points">CPD Points</Label>
                      <Input
                        id="cpd_points"
                        type="number"
                        step="0.5"
                        min="0"
                        value={formData.cpd_points}
                        onChange={(e) => setFormData({ ...formData, cpd_points: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="certificate_url">Certificate URL</Label>
                    <Input
                      id="certificate_url"
                      type="url"
                      value={formData.certificate_url}
                      onChange={(e) => setFormData({ ...formData, certificate_url: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Additional notes..."
                      rows={2}
                    />
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? "Adding..." : "Add Activity"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {activities.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No CPD activities recorded yet. Click "Add Activity" to get started.
            </p>
          ) : (
            <div className="space-y-4">
              {activities.map((activity) => (
                <Card key={activity.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="secondary">{activity.activity_type}</Badge>
                          <span className="text-sm text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(activity.date_completed), 'dd MMM yyyy')}
                          </span>
                        </div>
                        <h3 className="font-semibold text-lg">{activity.title}</h3>
                        {activity.description && (
                          <p className="text-sm text-muted-foreground mt-1">{activity.description}</p>
                        )}
                        {activity.provider && (
                          <p className="text-sm text-muted-foreground mt-1">Provider: {activity.provider}</p>
                        )}
                        <div className="flex gap-4 mt-2">
                          <span className="text-sm font-medium">
                            {activity.hours_claimed} hours
                          </span>
                          {activity.cpd_points && (
                            <span className="text-sm font-medium">
                              {activity.cpd_points} CPD points
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(activity.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};