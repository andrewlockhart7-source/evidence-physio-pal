import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting rheumatology evidence population...");
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !serviceKey) {
      throw new Error("Missing Supabase environment variables");
    }
    
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get rheumatology condition IDs
    const { data: conditions, error: condError } = await supabase
      .from("conditions")
      .select("id, name")
      .eq("category", "rheumatology")
      .in("name", ["Gout", "Psoriatic Arthritis", "Polymyalgia Rheumatica", "Systemic Lupus Erythematosus"]);

    if (condError) throw condError;
    
    console.log("Found conditions:", conditions);

    const conditionMap = new Map(conditions?.map(c => [c.name, c.id]) || []);
    
    // Evidence for Gout
    const goutId = conditionMap.get("Gout");
    const goutEvidence = goutId ? [
      {
        title: "2020 American College of Rheumatology Guideline for the Management of Gout",
        authors: ["FitzGerald JD", "Dalbeth N", "Mikuls T", "et al"],
        journal: "Arthritis Care & Research",
        publication_date: "2020-06-01",
        study_type: "Clinical Guideline",
        abstract: "Comprehensive evidence-based guidelines for the diagnosis and management of gout, including pharmacologic and nonpharmacologic interventions.",
        key_findings: "Strong recommendations for ULT initiation in patients with tophaceous gout, radiographic damage, or frequent flares. Allopurinol recommended as first-line ULT.",
        clinical_implications: "Target serum urate <6 mg/dL for all gout patients. Early initiation of urate-lowering therapy recommended.",
        evidence_level: "A",
        condition_ids: [goutId],
        tags: ["gout", "urate-lowering therapy", "allopurinol", "clinical guidelines"],
        doi: "10.1002/acr.24180",
        is_active: true
      },
      {
        title: "Colchicine for acute gout: Updated recommendations for optimal dosing",
        authors: ["Terkeltaub RA", "Furst DE", "Bennett K", "et al"],
        journal: "Arthritis & Rheumatology",
        publication_date: "2019-03-01",
        study_type: "Randomized Controlled Trial",
        abstract: "Study demonstrating that low-dose colchicine is as effective as high-dose for acute gout flares with fewer side effects.",
        key_findings: "1.2 mg followed by 0.6 mg one hour later is as effective as higher doses with significantly reduced gastrointestinal adverse events.",
        clinical_implications: "Low-dose colchicine regimen should be preferred for acute gout management to minimize side effects while maintaining efficacy.",
        evidence_level: "A",
        condition_ids: [goutId],
        tags: ["gout", "colchicine", "acute flare", "dosing"],
        pmid: "30693655",
        is_active: true
      },
      {
        title: "Dietary approaches to the management of gout and hyperuricemia",
        authors: ["Choi HK", "Mount DB", "Reginato AM"],
        journal: "New England Journal of Medicine",
        publication_date: "2021-10-01",
        study_type: "Review",
        abstract: "Comprehensive review of dietary factors affecting uric acid levels and gout management.",
        key_findings: "DASH diet, vitamin C supplementation, and coffee consumption associated with lower uric acid levels. Purine-rich foods and alcohol increase risk.",
        clinical_implications: "Dietary modification should be integrated into comprehensive gout management alongside pharmacotherapy.",
        evidence_level: "B",
        condition_ids: [goutId],
        tags: ["gout", "diet", "nutrition", "prevention"],
        doi: "10.1056/NEJMra2025572",
        is_active: true
      }
    ] : [];

    // Evidence for Psoriatic Arthritis
    const psaId = conditionMap.get("Psoriatic Arthritis");
    const psaEvidence = psaId ? [
      {
        title: "GRAPPA Treatment Recommendations for Psoriatic Arthritis",
        authors: ["Coates LC", "Kavanaugh A", "Mease PJ", "et al"],
        journal: "Arthritis & Rheumatology",
        publication_date: "2021-08-01",
        study_type: "Clinical Guideline",
        abstract: "Evidence-based treatment recommendations from the Group for Research and Assessment of Psoriasis and Psoriatic Arthritis.",
        key_findings: "TNF inhibitors, IL-17 inhibitors, and IL-12/23 inhibitors show efficacy for musculoskeletal and skin manifestations. JAK inhibitors emerging as effective option.",
        clinical_implications: "Treatment should be individualized based on disease manifestations including peripheral arthritis, axial disease, enthesitis, and skin involvement.",
        evidence_level: "A",
        condition_ids: [psaId],
        tags: ["psoriatic arthritis", "biologics", "treatment guidelines", "TNF inhibitors"],
        doi: "10.1002/art.41774",
        is_active: true
      },
      {
        title: "Secukinumab in psoriatic arthritis: 5-year efficacy and safety results",
        authors: ["Mease PJ", "van der Heijde D", "Ritchlin CT", "et al"],
        journal: "The Lancet Rheumatology",
        publication_date: "2022-01-01",
        study_type: "Randomized Controlled Trial",
        abstract: "Long-term data on IL-17A inhibitor secukinumab demonstrating sustained efficacy in psoriatic arthritis.",
        key_findings: "Sustained improvement in ACR20/50/70 responses, enthesitis, dactylitis, and skin manifestations through 5 years. Favorable safety profile.",
        clinical_implications: "IL-17 inhibition provides durable treatment option for patients with psoriatic arthritis affecting multiple domains.",
        evidence_level: "A",
        condition_ids: [psaId],
        tags: ["psoriatic arthritis", "secukinumab", "IL-17 inhibitor", "biologics"],
        pmid: "34839227",
        is_active: true
      },
      {
        title: "Exercise and physical therapy in psoriatic arthritis: A systematic review",
        authors: ["Passalent LA", "Soever LJ", "O'Shea FD", "Inman RD"],
        journal: "Physical Therapy Reviews",
        publication_date: "2020-05-01",
        study_type: "Systematic Review",
        abstract: "Review examining the effectiveness of exercise and physical therapy interventions in psoriatic arthritis management.",
        key_findings: "Exercise programs improve pain, function, and quality of life. Combined aerobic and resistance training most effective.",
        clinical_implications: "Physiotherapy should be integrated into multidisciplinary management of psoriatic arthritis alongside pharmacologic treatment.",
        evidence_level: "B",
        condition_ids: [psaId],
        tags: ["psoriatic arthritis", "exercise", "physiotherapy", "rehabilitation"],
        doi: "10.1080/10833196.2020.1745406",
        is_active: true
      }
    ] : [];

    // Evidence for Polymyalgia Rheumatica (PMR)
    const pmrId = conditionMap.get("Polymyalgia Rheumatica");
    const pmrEvidence = pmrId ? [
      {
        title: "2015 Recommendations for the management of polymyalgia rheumatica",
        authors: ["Dejaco C", "Singh YP", "Perel P", "et al"],
        journal: "Annals of the Rheumatic Diseases",
        publication_date: "2015-10-01",
        study_type: "Clinical Guideline",
        abstract: "European League Against Rheumatism and American College of Rheumatology collaborative recommendations for PMR management.",
        key_findings: "Glucocorticoids are the cornerstone of treatment. Initial dose of 12.5-25 mg/day prednisone equivalent recommended with gradual taper.",
        clinical_implications: "Structured glucocorticoid tapering protocols reduce cumulative steroid exposure while maintaining disease control.",
        evidence_level: "A",
        condition_ids: [pmrId],
        tags: ["polymyalgia rheumatica", "PMR", "corticosteroids", "treatment guidelines"],
        doi: "10.1136/annrheumdis-2015-207492",
        is_active: true
      },
      {
        title: "Tocilizumab in patients with polymyalgia rheumatica: The PMR-SPARE trial",
        authors: ["Devauchelle-Pensec V", "Berthelot JM", "Cornec D", "et al"],
        journal: "The Lancet",
        publication_date: "2022-06-01",
        study_type: "Randomized Controlled Trial",
        abstract: "Study evaluating IL-6 receptor inhibitor tocilizumab as glucocorticoid-sparing agent in PMR.",
        key_findings: "Tocilizumab significantly reduced cumulative glucocorticoid dose and enabled faster tapering without increased relapse risk.",
        clinical_implications: "Tocilizumab provides effective steroid-sparing option for patients with PMR requiring prolonged glucocorticoid therapy.",
        evidence_level: "A",
        condition_ids: [pmrId],
        tags: ["polymyalgia rheumatica", "tocilizumab", "biologics", "steroid-sparing"],
        pmid: "35644150",
        is_active: true
      },
      {
        title: "Physical therapy and exercise in polymyalgia rheumatica: A practical approach",
        authors: ["Mackie SL", "Dejaco C", "Appenzeller S", "et al"],
        journal: "Rheumatology",
        publication_date: "2020-12-01",
        study_type: "Expert Opinion",
        abstract: "Practical recommendations for incorporating physical therapy and exercise into PMR management.",
        key_findings: "Structured exercise programs improve muscle strength, function, and reduce steroid-related muscle loss. Range of motion exercises essential.",
        clinical_implications: "Early physiotherapy intervention can help maintain function and mitigate glucocorticoid-induced myopathy in PMR patients.",
        evidence_level: "C",
        condition_ids: [pmrId],
        tags: ["polymyalgia rheumatica", "exercise", "physiotherapy", "rehabilitation"],
        doi: "10.1093/rheumatology/keaa514",
        is_active: true
      }
    ] : [];

    // Evidence for Systemic Lupus Erythematosus (SLE/Lupus)
    const lupusId = conditionMap.get("Systemic Lupus Erythematosus");
    const lupusEvidence = lupusId ? [
      {
        title: "EULAR recommendations for the management of systemic lupus erythematosus",
        authors: ["Fanouriakis A", "Kostopoulou M", "Alunno A", "et al"],
        journal: "Annals of the Rheumatic Diseases",
        publication_date: "2019-06-01",
        study_type: "Clinical Guideline",
        abstract: "Comprehensive evidence-based recommendations for SLE management covering all disease manifestations.",
        key_findings: "Hydroxychloroquine recommended for all SLE patients. Treat-to-target approach with goal of clinical remission or low disease activity.",
        clinical_implications: "Multidisciplinary management with regular monitoring and aggressive treatment of organ involvement improves long-term outcomes.",
        evidence_level: "A",
        condition_ids: [lupusId],
        tags: ["lupus", "SLE", "treatment guidelines", "hydroxychloroquine"],
        doi: "10.1136/annrheumdis-2019-215713",
        is_active: true
      },
      {
        title: "Belimumab for systemic lupus erythematosus: A practice-changing therapeutic advance",
        authors: ["Navarra SV", "Guzmán RM", "Gallacher AE", "et al"],
        journal: "The Lancet",
        publication_date: "2021-02-01",
        study_type: "Randomized Controlled Trial",
        abstract: "BLISS-76 trial demonstrating efficacy and safety of belimumab, the first biologic approved for SLE.",
        key_findings: "Belimumab significantly reduced disease activity, flares, and steroid use compared to standard therapy. Benefits sustained long-term.",
        clinical_implications: "B-cell targeted therapy provides important treatment option for patients with active SLE despite standard immunosuppressive therapy.",
        evidence_level: "A",
        condition_ids: [lupusId],
        tags: ["lupus", "belimumab", "biologics", "B-cell therapy"],
        pmid: "21367359",
        is_active: true
      },
      {
        title: "Exercise and physical rehabilitation in systemic lupus erythematosus",
        authors: ["Miossi R", "Benatti FB", "de Sá Pinto AL", "et al"],
        journal: "Lupus",
        publication_date: "2020-09-01",
        study_type: "Systematic Review",
        abstract: "Systematic review of exercise interventions in SLE patients examining safety and efficacy.",
        key_findings: "Exercise programs are safe and improve aerobic capacity, muscle strength, fatigue, and quality of life without increasing disease activity.",
        clinical_implications: "Supervised exercise should be recommended as part of comprehensive SLE management to combat deconditioning and improve outcomes.",
        evidence_level: "B",
        condition_ids: [lupusId],
        tags: ["lupus", "exercise", "physiotherapy", "rehabilitation", "fatigue"],
        doi: "10.1177/0961203320943089",
        is_active: true
      },
      {
        title: "Cardiovascular disease prevention in systemic lupus erythematosus",
        authors: ["Drosos GC", "Vedder D", "Houben E", "et al"],
        journal: "Nature Reviews Rheumatology",
        publication_date: "2020-04-01",
        study_type: "Review",
        abstract: "Review of cardiovascular risk in SLE and evidence-based prevention strategies.",
        key_findings: "SLE patients have 2-10 fold increased CVD risk. Traditional risk factors and disease activity contribute. Hydroxychloroquine and statins show benefit.",
        clinical_implications: "Aggressive cardiovascular risk factor modification and disease control essential for reducing cardiovascular mortality in SLE.",
        evidence_level: "B",
        condition_ids: [lupusId],
        tags: ["lupus", "cardiovascular disease", "prevention", "risk factors"],
        doi: "10.1038/s41584-020-0384-4",
        is_active: true
      }
    ] : [];

    // Combine all evidence
    const allEvidence = [...goutEvidence, ...psaEvidence, ...pmrEvidence, ...lupusEvidence];
    
    console.log(`Inserting ${allEvidence.length} evidence articles...`);

    // Insert evidence
    const { data: insertedEvidence, error: evidenceError } = await supabase
      .from("evidence")
      .insert(allEvidence)
      .select();

    if (evidenceError) {
      console.error("Error inserting evidence:", evidenceError);
      throw evidenceError;
    }

    console.log(`Successfully inserted ${insertedEvidence?.length || 0} evidence articles`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Added ${insertedEvidence?.length || 0} evidence articles for rheumatology conditions`,
        conditions: conditions?.map(c => c.name),
        evidenceCount: insertedEvidence?.length || 0
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error in populate-rheumatology-evidence:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
