import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Users, Plus, Search, Globe, Lock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface StudyGroup {
  id: string;
  name: string;
  description: string | null;
  topic: string;
  max_members: number | null;
  is_public: boolean | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  meeting_schedule?: any;
  member_count?: number;
  is_member?: boolean;
  user_role?: string | null;
}

export const StudyGroups = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [groups, setGroups] = useState<StudyGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newGroup, setNewGroup] = useState({
    name: '',
    description: '',
    topic: '',
    max_members: 20,
    is_public: true,
  });

  const fetchGroups = async () => {
    try {
      setLoading(true);
      
      // Fetch groups
      const { data: groupsData, error: groupsError } = await supabase
        .from('study_groups')
        .select('*')
        .order('created_at', { ascending: false });

      if (groupsError) throw groupsError;

      // Fetch member counts and user membership status
      const groupsWithDetails = await Promise.all(
        (groupsData || []).map(async (group) => {
          // Get member count
          const { count } = await supabase
            .from('study_group_members')
            .select('*', { count: 'exact', head: true })
            .eq('group_id', group.id);

          // Check if current user is a member
          let is_member = false;
          let user_role = null;
          
          if (user) {
            const { data: memberData } = await supabase
              .from('study_group_members')
              .select('role')
              .eq('group_id', group.id)
              .eq('user_id', user.id)
              .single();
            
            if (memberData) {
              is_member = true;
              user_role = memberData.role;
            }
          }

          return {
            ...group,
            member_count: count || 0,
            is_member,
            user_role,
          };
        })
      );

      setGroups(groupsWithDetails);
    } catch (error: any) {
      console.error('Error fetching groups:', error);
      toast({
        title: "Error",
        description: "Failed to load study groups",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();

    // Set up real-time subscription
    const channel = supabase
      .channel('study-groups-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'study_groups'
        },
        () => {
          fetchGroups();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'study_group_members'
        },
        () => {
          fetchGroups();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleCreateGroup = async () => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to create a study group",
        variant: "destructive",
      });
      return;
    }

    if (!newGroup.name || !newGroup.topic) {
      toast({
        title: "Missing Information",
        description: "Please provide a name and topic for the group",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsCreating(true);
      
      const { error } = await supabase
        .from('study_groups')
        .insert({
          name: newGroup.name,
          description: newGroup.description || null,
          topic: newGroup.topic,
          max_members: newGroup.max_members,
          is_public: newGroup.is_public,
          created_by: user.id,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Study group created successfully",
      });

      setIsCreateDialogOpen(false);
      setNewGroup({
        name: '',
        description: '',
        topic: '',
        max_members: 20,
        is_public: true,
      });
      
      fetchGroups();
    } catch (error: any) {
      console.error('Error creating group:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create study group",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleJoinGroup = async (groupId: string, maxMembers: number, currentMembers: number) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to join a study group",
        variant: "destructive",
      });
      return;
    }

    if (currentMembers >= maxMembers) {
      toast({
        title: "Group Full",
        description: "This study group has reached maximum capacity",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('study_group_members')
        .insert({
          group_id: groupId,
          user_id: user.id,
          role: 'member',
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "You have joined the study group",
      });
      
      fetchGroups();
    } catch (error: any) {
      console.error('Error joining group:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to join study group",
        variant: "destructive",
      });
    }
  };

  const handleLeaveGroup = async (groupId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('study_group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "You have left the study group",
      });
      
      fetchGroups();
    } catch (error: any) {
      console.error('Error leaving group:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to leave study group",
        variant: "destructive",
      });
    }
  };

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    group.topic.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (group.description && group.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Study Groups</h1>
        <p className="text-muted-foreground">Join collaborative learning groups to discuss physiotherapy research and share knowledge.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search study groups..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Group
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create Study Group</DialogTitle>
              <DialogDescription>
                Create a new collaborative learning group for physiotherapy professionals.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Group Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Advanced MSK Research Group"
                  value={newGroup.name}
                  onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="topic">Topic *</Label>
                <Input
                  id="topic"
                  placeholder="e.g., MSK Research"
                  value={newGroup.topic}
                  onChange={(e) => setNewGroup({ ...newGroup, topic: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe the purpose and focus of your study group..."
                  value={newGroup.description}
                  onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_members">Maximum Members</Label>
                <Input
                  id="max_members"
                  type="number"
                  min="2"
                  max="100"
                  value={newGroup.max_members}
                  onChange={(e) => setNewGroup({ ...newGroup, max_members: parseInt(e.target.value) || 20 })}
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_public"
                  checked={newGroup.is_public}
                  onChange={(e) => setNewGroup({ ...newGroup, is_public: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="is_public" className="cursor-pointer">
                  Make this group public (anyone can join)
                </Label>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateGroup} disabled={isCreating}>
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Group'
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredGroups.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Study Groups Found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm ? "No groups match your search." : "Be the first to create a study group!"}
            </p>
            {!searchTerm && (
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Group
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGroups.map((group) => (
            <Card key={group.id} className="h-full flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{group.name}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">{group.topic}</p>
                  </div>
                  {group.is_public ? (
                    <Globe className="h-4 w-4 text-green-600" />
                  ) : (
                    <Lock className="h-4 w-4 text-orange-600" />
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4 flex-1 flex flex-col">
                {group.description && (
                  <p className="text-sm text-muted-foreground flex-1">{group.description}</p>
                )}
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <span>{group.member_count} / {group.max_members} members</span>
                    </div>
                    {group.is_member && (
                      <Badge variant="secondary">{group.user_role}</Badge>
                    )}
                  </div>

                  {group.is_member ? (
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => handleLeaveGroup(group.id)}
                      disabled={group.user_role === 'admin'}
                    >
                      {group.user_role === 'admin' ? 'Group Admin' : 'Leave Group'}
                    </Button>
                  ) : (
                    <Button 
                      className="w-full"
                      onClick={() => handleJoinGroup(group.id, group.max_members || 20, group.member_count || 0)}
                      disabled={(group.member_count || 0) >= (group.max_members || 20)}
                    >
                      {(group.member_count || 0) >= (group.max_members || 20) ? 'Group Full' : 'Join Group'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
