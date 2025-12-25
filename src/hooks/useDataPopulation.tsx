import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useDataPopulation = () => {
  const [isPopulated, setIsPopulated] = useState<boolean | null>(null);
  const [isPopulating, setIsPopulating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Add a small delay to avoid race conditions with auth
    const timer = setTimeout(() => {
      checkDataPopulation();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const checkDataPopulation = async () => {
    try {
      // Check if database has any data with timeout protection
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database check timeout')), 10000)
      );

      const dataPromise = Promise.all([
        supabase.from('conditions').select('*', { count: 'exact', head: true }),
        supabase.from('evidence').select('*', { count: 'exact', head: true }),
      ]);

      const [{ count: conditionsCount }, { count: evidenceCount }] = await Promise.race([
        dataPromise,
        timeoutPromise
      ]) as any;

      const hasData = (conditionsCount ?? 0) > 0 && (evidenceCount ?? 0) > 0;
      setIsPopulated(hasData);

      // Auto-populate if no data exists
      if (!hasData && !isPopulating) {
        await autoPopulate();
      }
    } catch (error) {
      console.error('Error checking data population:', error);
      // Don't crash the app, just mark as not populated
      setIsPopulated(false);
    }
  };

  const autoPopulate = async () => {
    setIsPopulating(true);

    try {
      console.log('🚀 Auto-populating database with real data...');
      
      // Call the optimized populate function
      const { error } = await supabase.functions.invoke('admin-populate', {
        body: { 
          task: 'populate_all',
          quick: true // Flag for quick initial population
        }
      });

      if (error) {
        console.error('Auto-population error:', error);
        toast({
          title: "Database Setup",
          description: "Setting up your database in the background...",
        });
      } else {
        setIsPopulated(true);
        toast({
          title: "Database Ready!",
          description: "Your evidence database has been populated with real data.",
        });
      }
    } catch (error) {
      console.error('Auto-population exception:', error);
    } finally {
      setIsPopulating(false);
    }
  };

  return {
    isPopulated,
    isPopulating,
    checkDataPopulation,
  };
};
