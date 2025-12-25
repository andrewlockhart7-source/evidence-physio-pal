import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getExternalEvidenceLink, getEvidenceSourceLinks } from "@/utils/evidenceLinks";
import { 
  FileText,
  ExternalLink,
  Calendar,
  Building,
  Users,
  CheckCircle,
  AlertCircle,
  Star,
  ChevronDown,
  Wrench
} from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";

interface ClinicalGuideline {
  id: string;
  title: string;
  organization: string;
  condition_category: string;
  publication_year: number;
  last_updated: string;
  guideline_url: string;
  summary: string;
  recommendations: any[];
  evidence_strength: string;
  target_population: string;
  clinical_questions: string[];
  key_recommendations: string[];
  implementation_notes: string;
  tags: string[];
  doi?: string | null;
  pmid?: string | null;
  journal?: string | null;
  grade_assessment?: any;
}

export const ClinicalGuidelinesLibrary = () => {
  const [guidelines, setGuidelines] = useState<ClinicalGuideline[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedOrganization, setSelectedOrganization] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearchTerm(searchTerm), 250);
    return () => clearTimeout(id);
  }, [searchTerm]);
  const [loading, setLoading] = useState(false);
  const [selectedGuideline, setSelectedGuideline] = useState<ClinicalGuideline | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchGuidelines();
  }, []);

  const fetchGuidelines = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('evidence')
        .select('*')
        .eq('study_type', 'Clinical Practice Guideline')
        .order('publication_date', { ascending: false });

      if (error) throw error;
      
      // Transform the data to match our interface
      const transformedGuidelines: ClinicalGuideline[] = (data || []).map(item => {
        const gradeAssessment = item.grade_assessment as any;
        // Use the evidenceLinks utility to properly resolve the URL (safe)
        let guidelineUrl = '#';
        try {
          const resolved = getExternalEvidenceLink({
            title: item.title,
            journal: item.journal,
            doi: item.doi,
            pmid: item.pmid,
            tags: item.tags,
            grade_assessment: gradeAssessment
          });
          if (resolved) guidelineUrl = resolved;
        } catch {
          guidelineUrl = '#';
        }
        
        return {
          id: item.id,
          title: item.title,
          organization: item.journal || item.authors?.[0] || 'Unknown Organization',
          condition_category: getConditionCategory(item.tags || []),
          publication_year: item.publication_date ? new Date(item.publication_date).getFullYear() : new Date().getFullYear(),
          last_updated: item.updated_at || item.created_at,
          guideline_url: guidelineUrl,
          summary: item.abstract || 'No summary available',
          recommendations: [],
          evidence_strength: item.evidence_level || 'Not specified',
          target_population: gradeAssessment?.condition || 'General population',
          clinical_questions: [],
          key_recommendations: gradeAssessment?.recommendations || item.key_findings?.split(';') || [],
          implementation_notes: item.clinical_implications || '',
          tags: item.tags || [],
          doi: item.doi,
          pmid: item.pmid,
          journal: item.journal,
          grade_assessment: gradeAssessment
        };
      });

      setGuidelines(transformedGuidelines);
    } catch (error: any) {
      toast({
        title: "Error fetching guidelines",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getConditionCategory = (tags: string[]): string => {
    const tagStr = tags.join(' ').toLowerCase();
    if (tagStr.includes('back') || tagStr.includes('pain') || tagStr.includes('osteoarthritis') || tagStr.includes('manual')) {
      return 'MSK';
    }
    if (tagStr.includes('stroke') || tagStr.includes('brain') || tagStr.includes('neurological')) {
      return 'Neurological';
    }
    if (tagStr.includes('copd') || tagStr.includes('respiratory') || tagStr.includes('pulmonary')) {
      return 'Respiratory';
    }
    if (tagStr.includes('rheumatoid') || tagStr.includes('arthritis') || tagStr.includes('lupus') || 
        tagStr.includes('spondylitis') || tagStr.includes('psoriatic') || tagStr.includes('rheumatology')) {
      return 'Rheumatology';
    }
    return 'General';
  };

  const cleanupInvalidGuidelines = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('cleanup-invalid-guidelines');

      if (error) throw error;

      toast({
        title: "Cleanup Complete",
        description: data.message || "Successfully cleaned up invalid guidelines",
      });

      // Refresh the guidelines list
      await fetchGuidelines();
    } catch (error: any) {
      toast({
        title: "Error during cleanup",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fixGuidelineUrls = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('fix-guideline-urls');

      if (error) throw error;

      toast({
        title: "URLs Fixed",
        description: data.message || "Successfully updated guideline URLs",
      });

      // Refresh the guidelines list
      await fetchGuidelines();
    } catch (error: any) {
      toast({
        title: "Error fixing URLs",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const repairGuidelineLinks = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.functions.invoke('repair-guideline-links');

      if (error) throw error;

      toast({
        title: "Links Repaired",
        description: data.message || "Successfully repaired mismatched guideline links",
      });

      // Refresh the guidelines list
      await fetchGuidelines();
    } catch (error: any) {
      toast({
        title: "Error repairing links",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMoreGuidelines = async () => {
    try {
      setLoading(true);
      
      // Determine search terms based on selected category
      let searchTerms = 'physiotherapy';
      if (selectedCategory !== 'all') {
        const categoryTerms: Record<string, string> = {
          'MSK': 'musculoskeletal low back pain osteoarthritis',
          'Neurological': 'stroke neurological rehabilitation',
          'Respiratory': 'copd respiratory pulmonary',
          'Rheumatology': 'rheumatoid arthritis psoriatic arthritis ankylosing spondylitis'
        };
        searchTerms = categoryTerms[selectedCategory] || 'physiotherapy';
      }

      toast({
        title: "Fetching Guidelines",
        description: `Searching multiple databases for ${selectedCategory === 'all' ? 'general' : selectedCategory} guidelines...`,
      });

      // Call all database integrations in parallel
      const integrations = [
        supabase.functions.invoke('guidelines-integration', {
          body: { searchTerms, organization: 'NICE', condition: searchTerms }
        }),
        supabase.functions.invoke('trip-database-integration', {
          body: { searchTerms, condition: searchTerms }
        }),
        supabase.functions.invoke('epistemonikos-integration', {
          body: { searchTerms, condition: searchTerms }
        }),
        supabase.functions.invoke('who-guidelines-integration', {
          body: { searchTerms, condition: searchTerms }
        })
      ];

      const results = await Promise.allSettled(integrations);
      
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const failedCount = results.filter(r => r.status === 'rejected').length;

      console.log('[FETCH-GUIDELINES] Results:', { successCount, failedCount, results });

      toast({
        title: "Guidelines Updated",
        description: `Successfully fetched from ${successCount} database${successCount !== 1 ? 's' : ''}${failedCount > 0 ? `, ${failedCount} failed` : ''}`,
      });

      // Refresh the guidelines list
      await fetchGuidelines();
    } catch (error: any) {
      toast({
        title: "Error fetching guidelines",
        description: error.message || "Failed to fetch guidelines. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getEvidenceStrengthColor = (strength: string) => {
    switch (strength?.toLowerCase()) {
      case 'high': return 'bg-green-500';
      case 'moderate': return 'bg-blue-500';
      case 'low': return 'bg-yellow-500';
      case 'very low': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getYearsAgo = (year: number) => {
    const currentYear = new Date().getFullYear();
    const yearsAgo = currentYear - year;
    if (yearsAgo === 0) return 'This year';
    if (yearsAgo === 1) return '1 year ago';
    return `${yearsAgo} years ago`;
  };

  const filteredGuidelines = guidelines.filter(guideline => {
    const matchesCategory = selectedCategory === 'all' || guideline.condition_category === selectedCategory;
    const matchesOrganization = selectedOrganization === 'all' || guideline.organization === selectedOrganization;
    const q = debouncedSearchTerm.toLowerCase();
    const matchesSearch = !q || guideline.title.toLowerCase().includes(q) ||
                         guideline.organization.toLowerCase().includes(q) ||
                         guideline.tags?.some(tag => tag.toLowerCase().includes(q));
    
    // Filter out guidelines that only have search URLs (not specific pages)
    // We rely on evidenceLinks.ts to generate proper links dynamically
    const sources = getEvidenceSourceLinks({
      title: guideline.title,
      journal: guideline.journal,
      doi: guideline.doi,
      pmid: guideline.pmid,
      tags: guideline.tags,
      grade_assessment: guideline.grade_assessment
    });
    
    // Keep only if we can generate at least one valid source link
    const hasValidSource = sources.length > 0;
    
    return matchesCategory && matchesOrganization && matchesSearch && hasValidSource;
  });

  const categories = [...new Set(guidelines.map(g => g.condition_category))];
  const organizations = [...new Set(guidelines.map(g => g.organization))];

  const GuidelineCard = ({ guideline }: { guideline: ClinicalGuideline }) => (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg leading-tight">{guideline.title}</CardTitle>
            <CardDescription className="mt-2 flex items-center gap-2">
              <Building className="h-4 w-4" />
              {guideline.organization}
            </CardDescription>
          </div>
          <div className="flex flex-col gap-2">
            <Badge className={`${getEvidenceStrengthColor(guideline.evidence_strength)} text-white`}>
              {guideline.evidence_strength || 'Not specified'}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {guideline.condition_category}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {guideline.publication_year} ({getYearsAgo(guideline.publication_year)})
          </div>
          {guideline.target_population && (
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {guideline.target_population.length > 20 
                ? `${guideline.target_population.substring(0, 20)}...` 
                : guideline.target_population}
            </div>
          )}
        </div>

        {guideline.summary && (
          <div>
            <h4 className="font-medium mb-2">Summary</h4>
            <p className="text-sm text-muted-foreground">
              {guideline.summary.length > 150 
                ? `${guideline.summary.substring(0, 150)}...` 
                : guideline.summary}
            </p>
          </div>
        )}

        {guideline.key_recommendations && guideline.key_recommendations.length > 0 && (
          <div>
            <h4 className="font-medium flex items-center gap-2 mb-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Key Recommendations ({guideline.key_recommendations.length})
            </h4>
            <div className="space-y-1">
              {guideline.key_recommendations.slice(0, 3).map((rec, index) => (
                <p key={index} className="text-sm text-muted-foreground">
                  • {rec.length > 80 ? `${rec.substring(0, 80)}...` : rec}
                </p>
              ))}
              {guideline.key_recommendations.length > 3 && (
                <p className="text-xs text-muted-foreground font-medium">
                  +{guideline.key_recommendations.length - 3} more recommendations
                </p>
              )}
            </div>
          </div>
        )}

        {guideline.clinical_questions && guideline.clinical_questions.length > 0 && (
          <div>
            <h4 className="font-medium mb-2">Clinical Questions Addressed</h4>
            <p className="text-sm text-muted-foreground">
              Addresses {guideline.clinical_questions.length} clinical question(s)
            </p>
          </div>
        )}

        {guideline.tags && guideline.tags.length > 0 && (
          <div>
            <h4 className="font-medium mb-2">Tags</h4>
            <div className="flex flex-wrap gap-1">
              {guideline.tags.slice(0, 4).map((tag, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {guideline.tags.length > 4 && (
                <Badge variant="outline" className="text-xs">
                  +{guideline.tags.length - 4}
                </Badge>
              )}
            </div>
          </div>
        )}

        {guideline.last_updated && (
          <div className="text-xs text-muted-foreground">
            Last updated: {new Date(guideline.last_updated).toLocaleDateString()}
          </div>
        )}

        <Separator />

        <div className="flex gap-2 pt-2">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1"
            onClick={() => {
              setSelectedGuideline(guideline);
              setIsDialogOpen(true);
            }}
          >
            <FileText className="h-4 w-4 mr-2" />
            View Details
          </Button>
          {(() => {
            try {
              const sources = getEvidenceSourceLinks({
                title: guideline.title,
                journal: guideline.journal,
                doi: guideline.doi,
                pmid: guideline.pmid,
                tags: guideline.tags,
                grade_assessment: guideline.grade_assessment
              });
              
              const primarySource = sources[0];
              const additionalSources = sources.slice(1);
              
              if (!primarySource) return null;
            
            return (
              <div className="flex gap-1 flex-1">
                <Button 
                  variant="default" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => window.open(primarySource.url, '_blank', 'noopener,noreferrer')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  {primarySource.label}
                </Button>
                {additionalSources.length > 0 && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="default" size="sm" className="px-2">
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="z-50 bg-background border shadow-lg">
                      <DropdownMenuLabel>More Sources</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {additionalSources.map((source, idx) => (
                        <DropdownMenuItem 
                          key={idx}
                          onClick={() => window.open(source.url, '_blank', 'noopener,noreferrer')}
                          className="cursor-pointer"
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          {source.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            );
            } catch (error) {
              console.error('[GUIDELINE-CARD] Error getting evidence sources:', error);
              return (
                <Button 
                  variant="default" 
                  size="sm" 
                  className="flex-1"
                  onClick={() => window.open(`https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(guideline.title)}`, '_blank', 'noopener,noreferrer')}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Search PubMed
                </Button>
              );
            }
          })()}
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Clinical Guidelines Library</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Comprehensive collection of evidence-based clinical practice guidelines from leading healthcare organizations.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search guidelines, organizations, or tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
        </div>
        <div className="flex gap-4">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map(category => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedOrganization} onValueChange={setSelectedOrganization}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select organization" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Organizations</SelectItem>
              {organizations.map(org => (
                <SelectItem key={org} value={org}>
                  {org}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">All Guidelines</TabsTrigger>
          <TabsTrigger value="MSK">MSK</TabsTrigger>
          <TabsTrigger value="Neurological">Neurological</TabsTrigger>
          <TabsTrigger value="Respiratory">Respiratory</TabsTrigger>
          <TabsTrigger value="Rheumatology">Rheumatology</TabsTrigger>
        </TabsList>

        <TabsContent value={selectedCategory} className="space-y-6">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {filteredGuidelines.length} of {guidelines.length} guidelines
            </p>
            <div className="flex gap-2">
              <Button onClick={cleanupInvalidGuidelines} variant="outline" size="sm" disabled={loading}>
                Clean Up Invalid
              </Button>
              <Button onClick={fixGuidelineUrls} variant="outline" size="sm" disabled={loading}>
                Fix URLs
              </Button>
              <Button onClick={repairGuidelineLinks} variant="outline" size="sm" disabled={loading}>
                <Wrench className="h-4 w-4 mr-2" />
                Repair Links
              </Button>
              <Button onClick={fetchMoreGuidelines} variant="default" disabled={loading}>
                <Star className="h-4 w-4 mr-2" />
                {loading ? 'Fetching...' : 'Fetch from All Databases'}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredGuidelines.map(guideline => (
              <GuidelineCard key={guideline.id} guideline={guideline} />
            ))}
          </div>

          {filteredGuidelines.length === 0 && (
            <Card>
              <CardContent className="text-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No guidelines found</h3>
                <p className="text-muted-foreground mb-4">
                  Try adjusting your search or filter criteria, or fetch the latest guidelines from NICE.
                </p>
                <Button onClick={fetchMoreGuidelines} disabled={loading}>
                  <Star className="h-4 w-4 mr-2" />
                  {loading ? 'Fetching...' : 'Fetch NICE Guidelines'}
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-xl">{selectedGuideline?.title}</DialogTitle>
            <DialogDescription>
              <div className="flex items-center gap-2 mt-2">
                <Building className="h-4 w-4" />
                {selectedGuideline?.organization}
              </div>
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-6">
              <div className="flex gap-2 flex-wrap">
                <Badge className={`${getEvidenceStrengthColor(selectedGuideline?.evidence_strength || '')} text-white`}>
                  {selectedGuideline?.evidence_strength || 'Not specified'}
                </Badge>
                <Badge variant="outline">{selectedGuideline?.condition_category}</Badge>
                <Badge variant="secondary">
                  <Calendar className="h-3 w-3 mr-1" />
                  {selectedGuideline?.publication_year}
                </Badge>
              </div>

              {selectedGuideline?.target_population && (
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Target Population
                  </h4>
                  <p className="text-sm text-muted-foreground">{selectedGuideline.target_population}</p>
                </div>
              )}

              {selectedGuideline?.summary && (
                <div>
                  <h4 className="font-semibold mb-2">Summary</h4>
                  <p className="text-sm text-muted-foreground">{selectedGuideline.summary}</p>
                </div>
              )}

              {selectedGuideline?.key_recommendations && selectedGuideline.key_recommendations.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    Key Recommendations
                  </h4>
                  <ul className="space-y-2">
                    {selectedGuideline.key_recommendations.map((rec, index) => (
                      <li key={index} className="text-sm text-muted-foreground flex gap-2">
                        <span className="text-primary font-semibold">{index + 1}.</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedGuideline?.implementation_notes && (
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Implementation Notes
                  </h4>
                  <p className="text-sm text-muted-foreground">{selectedGuideline.implementation_notes}</p>
                </div>
              )}

              {selectedGuideline?.clinical_questions && selectedGuideline.clinical_questions.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Clinical Questions Addressed</h4>
                  <ul className="space-y-2">
                    {selectedGuideline.clinical_questions.map((question, index) => (
                      <li key={index} className="text-sm text-muted-foreground">
                        • {question}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedGuideline?.tags && selectedGuideline.tags.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Tags</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedGuideline.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedGuideline?.guideline_url && selectedGuideline.guideline_url !== '#' && (
                <div className="pt-4">
                  <Button 
                    className="w-full"
                    onClick={() => {
                      window.open(selectedGuideline.guideline_url, '_blank', 'noopener,noreferrer');
                    }}
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open Full Guideline
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};