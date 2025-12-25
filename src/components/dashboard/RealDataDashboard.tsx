import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, FileText, Search, Activity, TrendingUp, Database } from "lucide-react";

interface DatabaseStats {
  conditions: number;
  evidence: number;
  assessmentTools: number;
  protocols: number;
  users: number;
  recentEvidence: any[];
}

export const RealDataDashboard = () => {
  const [stats, setStats] = useState<DatabaseStats>({
    conditions: 0,
    evidence: 0,
    assessmentTools: 0,
    protocols: 0,
    users: 0,
    recentEvidence: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDatabaseStats();
  }, []);

  const fetchDatabaseStats = async () => {
    try {
      console.log('[RealDataDashboard] Fetching database stats...');
      
      // Get counts from all tables
      const [conditionsResult, evidenceResult, toolsResult, protocolsResult, usersResult, recentResult] = await Promise.all([
        supabase.from('conditions').select('*', { count: 'exact', head: true }),
        supabase.from('evidence').select('*', { count: 'exact', head: true }),
        supabase.from('assessment_tools').select('*', { count: 'exact', head: true }),
        supabase.from('treatment_protocols').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase
          .from('evidence')
          .select('title, publication_date, evidence_level, journal')
          .not('publication_date', 'is', null)
          .order('publication_date', { ascending: false })
          .limit(5)
      ]);

      console.log('[RealDataDashboard] Raw counts:', {
        conditions: conditionsResult.count,
        evidence: evidenceResult.count,
        assessmentTools: toolsResult.count,
        protocols: protocolsResult.count,
        users: usersResult.count
      });

      setStats({
        conditions: conditionsResult.count || 0,
        evidence: evidenceResult.count || 0,
        assessmentTools: toolsResult.count || 0,
        protocols: protocolsResult.count || 0,
        users: usersResult.count || 0,
        recentEvidence: recentResult.data || []
      });
    } catch (error) {
      console.error('Error fetching database stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: "Medical Conditions",
      value: stats.conditions,
      icon: <Activity className="h-6 w-6 text-medical-blue" />,
      description: "Comprehensive condition database"
    },
    {
      title: "Evidence Papers",
      value: stats.evidence,
      icon: <BookOpen className="h-6 w-6 text-medical-green" />,
      description: "Peer-reviewed research articles"
    },
    {
      title: "Assessment Tools",
      value: stats.assessmentTools,
      icon: <Search className="h-6 w-6 text-medical-blue" />,
      description: "Validated assessment instruments"
    },
    {
      title: "Treatment Protocols",
      value: stats.protocols,
      icon: <FileText className="h-6 w-6 text-medical-green" />,
      description: "Evidence-based protocols"
    },
    {
      title: "Registered Users",
      value: stats.users,
      icon: <TrendingUp className="h-6 w-6 text-medical-blue" />,
      description: "Healthcare professionals"
    }
  ];

  const getEvidenceLevelColor = (level: string) => {
    switch (level) {
      case 'A': return 'bg-green-100 text-green-800';
      case 'B': return 'bg-blue-100 text-blue-800';
      case 'C': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="space-y-2">
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-8 bg-muted rounded w-1/2"></div>
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {statCards.map((stat, index) => (
          <Card key={index} className="hover:shadow-lg transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              {stat.icon}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-medical-blue">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Evidence */}
      <Card>
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Database className="h-5 w-5 text-medical-blue" />
            <CardTitle>Recent Evidence Added</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.recentEvidence.length > 0 ? (
              stats.recentEvidence.map((evidence, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 rounded-lg bg-muted/30">
                  <BookOpen className="h-5 w-5 text-medical-blue mt-1" />
                  <div className="flex-1 space-y-1">
                    <h4 className="font-medium text-sm leading-tight">{evidence.title}</h4>
                    <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                      <span>{evidence.journal}</span>
                      {evidence.publication_date && (
                        <span>• {new Date(evidence.publication_date).getFullYear()}</span>
                      )}
                    </div>
                  </div>
                  {evidence.evidence_level && (
                    <Badge className={`text-xs ${getEvidenceLevelColor(evidence.evidence_level)}`}>
                      Level {evidence.evidence_level}
                    </Badge>
                  )}
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-center py-4">No evidence data available</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};