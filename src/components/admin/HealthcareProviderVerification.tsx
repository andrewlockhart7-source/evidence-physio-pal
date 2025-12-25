import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Shield, AlertTriangle, CheckCircle, XCircle, User, FileText } from "lucide-react";
import { Header } from "@/components/Header";

type HealthcareRole = 'physiotherapist' | 'doctor' | 'nurse' | 'occupational_therapist' | 'speech_therapist' | 'admin';

interface Profile {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  healthcare_role: HealthcareRole | null;
  license_number: string | null;
  license_verified: boolean | null;
  license_expiry_date: string | null;
  department: string | null;
  approved_for_patient_access: boolean | null;
  professional_title: string | null;
  registration_number: string | null;
  specialization: string[] | null;
  created_at: string;
  updated_at: string;
}

export const HealthcareProviderVerification = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<Profile | null>(null);

  const [profileData, setProfileData] = useState<{
    healthcare_role: HealthcareRole | '';
    license_number: string;
    license_expiry_date: string;
    department: string;
  }>({
    healthcare_role: '',
    license_number: '',
    license_expiry_date: '',
    department: ''
  });

  const healthcareRoles: HealthcareRole[] = [
    'physiotherapist',
    'doctor', 
    'nurse',
    'occupational_therapist',
    'speech_therapist',
    'admin'
  ];

  useEffect(() => {
    if (user) {
      fetchUserProfile();
      fetchAllProfiles();
    }
  }, [user]);

  const fetchUserProfile = async () => {
    try {
  const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user?.id || '')
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      setUserProfile(data);
    } catch (error: any) {
      console.error('Error fetching user profile:', error);
    }
  };

  const fetchAllProfiles = async () => {
    try {
      // Check if user is admin first using secure function
      const { data: isAdminData } = await supabase.rpc('is_admin');
      
      if (isAdminData) {
        // Only admins can see provider profiles - secure access
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .not('healthcare_role', 'is', null)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setProfiles(data || []);
      } else {
        setProfiles([]);
      }
    } catch (error: any) {
      console.error('Error fetching provider profiles:', error);
      setProfiles([]);
    } finally {
      setLoading(false);
    }
  };

  const updateUserProfile = async () => {
    if (!user || !profileData.healthcare_role) {
      toast({
        title: "Missing Information",
        description: "Please select a healthcare role",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          healthcare_role: profileData.healthcare_role as HealthcareRole,
          license_number: profileData.license_number || null,
          license_expiry_date: profileData.license_expiry_date || null,
          department: profileData.department || null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);

      if (error) throw error;

      toast({
        title: "Profile Updated",
        description: "Your healthcare provider information has been updated. An admin will verify your credentials.",
      });

      fetchUserProfile();
      setProfileData({
        healthcare_role: '',
        license_number: '',
        license_expiry_date: '',
        department: ''
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const approveProvider = async (profileId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          license_verified: true,
          approved_for_patient_access: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', profileId);

      if (error) throw error;

      toast({
        title: "Provider Approved",
        description: "Healthcare provider has been verified and approved for patient access",
      });

      fetchAllProfiles();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const revokeAccess = async (profileId: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          license_verified: false,
          approved_for_patient_access: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', profileId);

      if (error) throw error;

      toast({
        title: "Access Revoked",
        description: "Patient access has been revoked for this provider",
      });

      fetchAllProfiles();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getVerificationStatus = (profile: Profile) => {
    if (profile.license_verified && profile.approved_for_patient_access) {
      return { status: 'verified', color: 'bg-green-500', icon: CheckCircle };
    } else if (profile.healthcare_role) {
      return { status: 'pending', color: 'bg-yellow-500', icon: AlertTriangle };
    } else {
      return { status: 'unverified', color: 'bg-red-500', icon: XCircle };
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Healthcare Provider Verification</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Secure patient data access through verified healthcare provider credentials
        </p>
      </div>

      {/* User Profile Status */}
      {userProfile && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Your Verification Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    {userProfile.first_name} {userProfile.last_name}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Role: {userProfile.healthcare_role || 'Not specified'}
                  </p>
                  {userProfile.license_number && (
                    <p className="text-sm text-muted-foreground">
                      License: {userProfile.license_number}
                    </p>
                  )}
                </div>
                <Badge className={`${getVerificationStatus(userProfile).color} text-white`}>
                  {getVerificationStatus(userProfile).status}
                </Badge>
              </div>
              
              {!userProfile.approved_for_patient_access && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    You need to be verified as a healthcare provider to access patient data. 
                    Please update your profile with your credentials.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Update Profile Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Update Healthcare Credentials
          </CardTitle>
          <CardDescription>
            Provide your healthcare credentials for verification
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Healthcare Role</Label>
              <Select 
                value={profileData.healthcare_role}
                onValueChange={(value) => setProfileData(prev => ({ ...prev, healthcare_role: value as HealthcareRole }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent>
                  {healthcareRoles.map(role => (
                    <SelectItem key={role} value={role}>
                      {role.charAt(0).toUpperCase() + role.slice(1).replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>License Number</Label>
              <Input
                value={profileData.license_number}
                onChange={(e) => setProfileData(prev => ({ ...prev, license_number: e.target.value }))}
                placeholder="Enter your professional license number"
              />
            </div>

            <div className="space-y-2">
              <Label>License Expiry Date</Label>
              <Input
                type="date"
                value={profileData.license_expiry_date}
                onChange={(e) => setProfileData(prev => ({ ...prev, license_expiry_date: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Department</Label>
              <Input
                value={profileData.department}
                onChange={(e) => setProfileData(prev => ({ ...prev, department: e.target.value }))}
                placeholder="e.g. Physiotherapy, Orthopedics"
              />
            </div>

            <Button onClick={updateUserProfile} className="w-full">
              <Shield className="h-4 w-4 mr-2" />
              Submit for Verification
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Admin Section - Only show if user is admin */}
      {userProfile?.healthcare_role === 'admin' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Provider Verification (Admin)
            </CardTitle>
            <CardDescription>
              Verify healthcare providers and grant patient access
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {profiles
                .filter(profile => profile.healthcare_role)
                .map((profile) => {
                  const verification = getVerificationStatus(profile);
                  const StatusIcon = verification.icon;
                  
                  return (
                    <div key={profile.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <StatusIcon className={`h-5 w-5 ${verification.status === 'verified' ? 'text-green-600' : 
                          verification.status === 'pending' ? 'text-yellow-600' : 'text-red-600'}`} />
                        <div>
                          <p className="font-medium">
                            {profile.first_name} {profile.last_name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {profile.healthcare_role} | {profile.license_number || 'No license provided'}
                          </p>
                          {profile.department && (
                            <p className="text-sm text-muted-foreground">
                              Department: {profile.department}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        {!profile.approved_for_patient_access ? (
                          <Button 
                            onClick={() => approveProvider(profile.id)}
                            size="sm"
                            variant="default"
                          >
                            Approve
                          </Button>
                        ) : (
                          <Button 
                            onClick={() => revokeAccess(profile.id)}
                            size="sm"
                            variant="destructive"
                          >
                            Revoke
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              
              {profiles.filter(profile => profile.healthcare_role).length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  No healthcare providers to verify
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
        </div>
      </main>
    </div>
  );
};