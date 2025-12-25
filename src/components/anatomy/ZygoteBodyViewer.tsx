import { useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useActivityTracking } from "@/hooks/useActivityTracking";

export const ZygoteBodyViewer = () => {
  const { trackAnatomyViewer } = useActivityTracking();
  const sessionStartRef = useRef<Date>(new Date());

  // Track anatomy viewer usage when component unmounts
  useEffect(() => {
    return () => {
      const durationMinutes = Math.round((new Date().getTime() - sessionStartRef.current.getTime()) / 60000);
      if (durationMinutes > 0) {
        trackAnatomyViewer('Full Body - Zygote', durationMinutes);
      }
    };
  }, [trackAnatomyViewer]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Innerbody Anatomy Explorer</CardTitle>
        <CardDescription>
          Comprehensive interactive anatomy explorer with detailed anatomical systems and labels
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="w-full h-[600px] border rounded-lg overflow-hidden bg-background">
          <iframe
            src="https://www.innerbody.com/htm/body.html"
            className="w-full h-full"
            title="Innerbody Anatomy Explorer"
            allowFullScreen
          />
        </div>
        <div className="mt-4 p-4 bg-muted/30 rounded-lg">
          <p className="text-sm text-muted-foreground">
            💡 Innerbody Anatomy Explorer provides detailed views of all major body systems including skeletal, muscular, cardiovascular, nervous, and more. Click on structures to explore detailed information and labels.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
