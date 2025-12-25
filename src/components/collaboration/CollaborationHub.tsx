import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/hooks/useSubscription";
import { PremiumFeature } from "@/components/subscription/PremiumFeature";
import {
  Share2,
  Users,
  Star,
  MessageSquare,
  Eye,
  ThumbsUp,
  ThumbsDown,
  Send,
  Globe,
  Lock,
  UserPlus,
  Copy,
  CheckCircle,
  Clock,
  AlertTriangle
} from "lucide-react";

interface SharedProtocol {
  id: string;
  protocol_id: string;
  shared_by: string;
  shared_with: string | null;
  is_public: boolean | null;
  access_level: string;
  created_at: string;
  protocol: {
    name: string;
    description: string | null;
    created_by: string | null;
    is_validated: boolean | null;
  };
}

interface ProtocolReview {
  id: string;
  protocol_id: string;
  reviewer_id: string;
  rating: number | null;
  review_text: string | null;
  recommendations: string | null;
  status: string;
  created_at: string;
  profiles?: {
    first_name: string | null;
    last_name: string | null;
    professional_title: string | null;
  };
}

export const CollaborationHub = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { subscribed } = useSubscription();
  
  const [sharedProtocols, setSharedProtocols] = useState<SharedProtocol[]>([]);
  const [myProtocols, setMyProtocols] = useState<any[]>([]);
  const [reviews, setReviews] = useState<ProtocolReview[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [shareModal, setShareModal] = useState<{ open: boolean; protocol: any | null }>({
    open: false,
    protocol: null
  });
  
  const [reviewModal, setReviewModal] = useState<{ open: boolean; protocol: any | null }>({
    open: false,
    protocol: null
  });
  
  const [shareSettings, setShareSettings] = useState({
    is_public: false,
    access_level: 'view' as 'view' | 'comment' | 'edit',
    shared_with_email: ''
  });
  
  const [newReview, setNewReview] = useState({
    rating: 5,
    review_text: '',
    recommendations: ''
  });

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      if (!user) {
        setLoading(false);
        return;
      }

      // Fetch shared protocols
      const { data: shared, error: sharedError } = await supabase
        .from('collaboration_shared_protocols')
        .select(`
          *,
          treatment_protocols!inner(name, description, created_by, is_validated)
        `)
        .or(`shared_with.eq.${user.id},is_public.eq.true`);

      if (sharedError) {
        console.error('Shared protocols error:', sharedError);
        throw sharedError;
      }

      // Transform the data to match the expected format
      const transformedShared = (shared || []).map(item => ({
        ...item,
        protocol: item.treatment_protocols
      }));

      // Fetch my protocols for sharing
      const { data: myProtos, error: myError } = await supabase
        .from('treatment_protocols')
        .select('*')
        .eq('created_by', user.id);

      if (myError) {
        console.error('My protocols error:', myError);
        throw myError;
      }

      // Fetch reviews - simplified query without join since FK might not be set up
      const { data: reviewData, error: reviewError } = await supabase
        .from('protocol_reviews')
        .select('*')
        .order('created_at', { ascending: false });

      if (reviewError) {
        console.error('Reviews error:', reviewError);
      }

      // Fetch reviewer profiles separately if we have reviews
      let enrichedReviews: ProtocolReview[] = [];
      if (reviewData && reviewData.length > 0) {
        const reviewerIds = [...new Set(reviewData.map(r => r.reviewer_id))];
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name, professional_title')
          .in('user_id', reviewerIds);

        enrichedReviews = reviewData.map(review => ({
          ...review,
          profiles: profilesData?.find(p => p.user_id === review.reviewer_id) || undefined
        }));
      }

      setSharedProtocols(transformedShared || []);
      setMyProtocols(myProtos || []);
      setReviews(enrichedReviews || []);
    } catch (error: any) {
      console.error('Fetch collaboration data error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to fetch collaboration data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const shareProtocol = async () => {
    if (!shareModal.protocol) return;

    try {
      const shareData: any = {
        protocol_id: shareModal.protocol.id,
        shared_by: user?.id,
        is_public: shareSettings.is_public,
        access_level: shareSettings.access_level
      };

      if (shareSettings.shared_with_email && !shareSettings.is_public) {
        // In a real app, you'd lookup user by email
        // For demo, we'll just use the email as shared_with
        shareData.shared_with = shareSettings.shared_with_email;
      }

      const { error } = await supabase
        .from('collaboration_shared_protocols')
        .insert(shareData);

      if (error) throw error;

      toast({
        title: "Protocol Shared",
        description: shareSettings.is_public 
          ? "Protocol is now publicly available" 
          : "Protocol shared with specified user",
      });

      setShareModal({ open: false, protocol: null });
      setShareSettings({
        is_public: false,
        access_level: 'view',
        shared_with_email: ''
      });
      
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const submitReview = async () => {
    if (!reviewModal.protocol) return;

    try {
      const { error } = await supabase
        .from('protocol_reviews')
        .insert({
          protocol_id: reviewModal.protocol.id,
          reviewer_id: user?.id || '',
          rating: newReview.rating,
          review_text: newReview.review_text,
          recommendations: newReview.recommendations,
          status: 'pending'
        });

      if (error) throw error;

      toast({
        title: "Review Submitted",
        description: "Your review has been submitted for peer review",
      });

      setReviewModal({ open: false, protocol: null });
      setNewReview({
        rating: 5,
        review_text: '',
        recommendations: ''
      });
      
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'bg-green-500';
      case 'rejected': return 'bg-red-500';
      case 'needs_revision': return 'bg-yellow-500';
      case 'pending': return 'bg-blue-500';
      default: return 'bg-gray-500';
    }
  };

  const copyShareLink = (protocolId: string) => {
    const link = `${window.location.origin}/protocols/${protocolId}`;
    navigator.clipboard.writeText(link);
    toast({
      title: "Link Copied",
      description: "Share link copied to clipboard",
    });
  };

  if (!subscribed) {
    return (
      <div className="container mx-auto px-4 py-8">
        <PremiumFeature feature="Collaboration Hub" showUpgrade={true}>
          <div className="text-center py-12">
            <Share2 className="h-16 w-16 mx-auto mb-6 text-muted-foreground" />
            <h2 className="text-2xl font-bold mb-4">Collaboration Hub</h2>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              Share protocols, collaborate with peers, and participate in evidence-based practice through peer review.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto mb-8">
              <div className="p-4 border rounded-lg">
                <Share2 className="h-8 w-8 mx-auto mb-2 text-primary" />
                <h3 className="font-semibold mb-2">Protocol Sharing</h3>
                <p className="text-sm text-muted-foreground">Share treatment protocols with colleagues and the community</p>
              </div>
              <div className="p-4 border rounded-lg">
                <Users className="h-8 w-8 mx-auto mb-2 text-primary" />
                <h3 className="font-semibold mb-2">Peer Review</h3>
                <p className="text-sm text-muted-foreground">Get expert feedback on your clinical protocols</p>
              </div>
              <div className="p-4 border rounded-lg">
                <Star className="h-8 w-8 mx-auto mb-2 text-primary" />
                <h3 className="font-semibold mb-2">Evidence Building</h3>
                <p className="text-sm text-muted-foreground">Contribute to evidence-based practice standards</p>
              </div>
            </div>
          </div>
        </PremiumFeature>
      </div>
    );
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading collaboration data...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Collaboration Hub</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Share treatment protocols, collaborate with peers, and contribute to evidence-based practice through peer review.
        </p>
      </div>

      <Tabs defaultValue="shared" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="shared">Shared Protocols</TabsTrigger>
          <TabsTrigger value="my-protocols">My Protocols</TabsTrigger>
          <TabsTrigger value="reviews">Peer Reviews</TabsTrigger>
        </TabsList>

        <TabsContent value="shared" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Protocols Shared With Me</h2>
            <Badge variant="outline">{sharedProtocols.length} protocols</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sharedProtocols.map((shared) => (
              <Card key={shared.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{shared.protocol.name}</CardTitle>
                    <div className="flex gap-1">
                      {shared.is_public ? (
                        <Globe className="h-4 w-4 text-green-600" />
                      ) : (
                        <Lock className="h-4 w-4 text-blue-600" />
                      )}
                      <Badge variant="outline" className="text-xs">
                        {shared.access_level}
                      </Badge>
                    </div>
                  </div>
                  <CardDescription>{shared.protocol.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                      {shared.access_level !== 'view' && (
                        <Button variant="outline" size="sm">
                          <MessageSquare className="h-3 w-3 mr-1" />
                          Comment
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Shared {new Date(shared.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {sharedProtocols.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <Share2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium mb-2">No Shared Protocols</h3>
                <p className="text-muted-foreground">
                  Protocols shared with you will appear here.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="my-protocols" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">My Protocols</h2>
            <Badge variant="outline">{myProtocols.length} protocols</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {myProtocols.map((protocol) => (
              <Card key={protocol.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{protocol.name}</CardTitle>
                    {protocol.is_validated && (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    )}
                  </div>
                  <CardDescription>{protocol.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center">
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShareModal({ open: true, protocol })}
                      >
                        <Share2 className="h-3 w-3 mr-1" />
                        Share
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyShareLink(protocol.id)}
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        Copy Link
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Created {new Date(protocol.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {myProtocols.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium mb-2">No Protocols Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first treatment protocol to start collaborating.
                </p>
                <Button>Create Protocol</Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="reviews" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Peer Reviews</h2>
            <Button
              onClick={() => setReviewModal({ open: true, protocol: null })}
              disabled={myProtocols.length === 0}
            >
              <Star className="h-4 w-4 mr-2" />
              Request Review
            </Button>
          </div>

          <div className="space-y-3">
            {reviews.map((review) => (
              <Card key={review.id}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-medium">Protocol Review</h4>
                      <p className="text-sm text-muted-foreground">
                        Reviewed by {review.profiles?.first_name || 'Unknown'} {review.profiles?.last_name || ''}
                        {review.profiles?.professional_title && 
                          `, ${review.profiles.professional_title}`
                        }
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            className={`h-4 w-4 ${
                              star <= (review.rating || 0) 
                                ? 'fill-yellow-400 text-yellow-400' 
                                : 'text-gray-300'
                            }`}
                          />
                        ))}
                      </div>
                      <Badge className={`${getStatusColor(review.status)} text-white`}>
                        {review.status}
                      </Badge>
                    </div>
                  </div>
                  
                  {review.review_text && (
                    <div className="mb-2">
                      <p className="text-sm font-medium mb-1">Review:</p>
                      <p className="text-sm text-muted-foreground">{review.review_text}</p>
                    </div>
                  )}
                  
                  {review.recommendations && (
                    <div>
                      <p className="text-sm font-medium mb-1">Recommendations:</p>
                      <p className="text-sm text-muted-foreground">{review.recommendations}</p>
                    </div>
                  )}
                  
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(review.created_at).toLocaleDateString()}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {reviews.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-medium mb-2">No Reviews Yet</h3>
                <p className="text-muted-foreground">
                  Peer reviews and feedback will appear here.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

      </Tabs>

      {/* Share Protocol Dialog */}
      <Dialog open={shareModal.open} onOpenChange={(open) => setShareModal({ open, protocol: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Protocol</DialogTitle>
            <DialogDescription>
              Configure how you want to share "{shareModal.protocol?.name}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Sharing Options</label>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="public"
                  checked={shareSettings.is_public}
                  onChange={(e) => setShareSettings(prev => ({ 
                    ...prev, 
                    is_public: e.target.checked 
                  }))}
                />
                <label htmlFor="public" className="text-sm">Make publicly available</label>
              </div>
            </div>

            {!shareSettings.is_public && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Share with specific user</label>
                <Input
                  placeholder="Enter email address"
                  value={shareSettings.shared_with_email}
                  onChange={(e) => setShareSettings(prev => ({ 
                    ...prev, 
                    shared_with_email: e.target.value 
                  }))}
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Access Level</label>
              <Select
                value={shareSettings.access_level}
                onValueChange={(value: 'view' | 'comment' | 'edit') => 
                  setShareSettings(prev => ({ ...prev, access_level: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="view">View Only</SelectItem>
                  <SelectItem value="comment">View & Comment</SelectItem>
                  <SelectItem value="edit">View, Comment & Edit</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={shareProtocol} className="flex-1">
                <Share2 className="h-4 w-4 mr-2" />
                Share Protocol
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShareModal({ open: false, protocol: null })}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Review Request Dialog */}
      <Dialog open={reviewModal.open} onOpenChange={(open) => setReviewModal({ open, protocol: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Peer Review</DialogTitle>
            <DialogDescription>
              Submit your protocol for peer review to improve quality and validation.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Protocol</label>
              <Select
                value={reviewModal.protocol?.id || ''}
                onValueChange={(value) => {
                  const protocol = myProtocols.find(p => p.id === value);
                  setReviewModal({ open: true, protocol });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a protocol to review" />
                </SelectTrigger>
                <SelectContent>
                  {myProtocols.map(protocol => (
                    <SelectItem key={protocol.id} value={protocol.id}>
                      {protocol.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Initial Self-Rating</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-6 w-6 cursor-pointer ${
                      star <= newReview.rating 
                        ? 'fill-yellow-400 text-yellow-400' 
                        : 'text-gray-300'
                    }`}
                    onClick={() => setNewReview(prev => ({ ...prev, rating: star }))}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Review Notes</label>
              <Textarea
                placeholder="Describe your protocol and any specific areas you'd like feedback on..."
                value={newReview.review_text}
                onChange={(e) => setNewReview(prev => ({ ...prev, review_text: e.target.value }))}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Areas for Improvement</label>
              <Textarea
                placeholder="What aspects would you like reviewers to focus on?"
                value={newReview.recommendations}
                onChange={(e) => setNewReview(prev => ({ ...prev, recommendations: e.target.value }))}
                rows={2}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={submitReview} className="flex-1">
                <Send className="h-4 w-4 mr-2" />
                Submit for Review
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setReviewModal({ open: false, protocol: null })}
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};