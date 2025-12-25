import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Brain, MessageSquare, Mic, Volume2, Heart, BarChart3, Bell, Users, Sparkles } from "lucide-react";
import { AISummarizer } from "@/components/ai/AISummarizer";
import { ChatGPTInterface } from "@/components/ai/ChatGPTInterface";
import { RealtimeChat } from "@/components/collaboration/RealtimeChat";
import { ZygoteBodyViewer } from "@/components/anatomy/ZygoteBodyViewer";
import VoiceChat from "@/components/ai/VoiceChat";
import { EnhancedAnalyticsDashboard } from "@/components/advanced/EnhancedAnalyticsDashboard";
import { AddSessionForm } from "@/components/analytics/AddSessionForm";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { StudyGroups } from "@/components/collaboration/StudyGroups";
import { Header } from "@/components/Header";

export const AdvancedFeatures = () => {
  const [activeFeature, setActiveFeature] = useState("ai-tools");

  const features = [
    {
      id: "ai-tools",
      label: "AI Tools",
      icon: <Brain className="h-4 w-4" />,
      description: "Evidence analysis and recommendations",
      badge: "New"
    },
    {
      id: "chatgpt",
      label: "AI Assistant",
      icon: <MessageSquare className="h-4 w-4" />,
      description: "Advanced AI clinical guidance"
    },
    {
      id: "realtime-chat",
      label: "Voice Chat",
      icon: <Mic className="h-4 w-4" />,
      description: "Real-time voice & text chat"
    },
    {
      id: "anatomy-3d",
      label: "3D Anatomy",
      icon: <Heart className="h-4 w-4" />,
      description: "Interactive anatomical viewer"
    },
    {
      id: "analytics",
      label: "Analytics",
      icon: <BarChart3 className="h-4 w-4" />,
      description: "Practice insights & outcomes",
      badge: "Premium"
    },
    {
      id: "notifications",
      label: "Notifications",
      icon: <Bell className="h-4 w-4" />,
      description: "Research alerts & updates"
    },
    {
      id: "study-groups",
      label: "Study Groups",
      icon: <Users className="h-4 w-4" />,
      description: "Collaborative learning"
    }
  ];

  return (
    <div className="min-h-screen">
      <Header />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Header */}
      <Card className="bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Sparkles className="h-6 w-6 text-primary" />
            Advanced Features
          </CardTitle>
          <CardDescription className="text-base">
            Explore cutting-edge tools powered by AI, real-time collaboration, and advanced analytics
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Feature Navigation */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {features.map((feature) => (
              <Button
                key={feature.id}
                variant={activeFeature === feature.id ? "default" : "outline"}
                className="h-auto p-4 flex flex-col items-center gap-2 relative"
                onClick={() => setActiveFeature(feature.id)}
              >
                {feature.badge && (
                  <Badge 
                    variant={feature.badge === "Premium" ? "default" : "secondary"} 
                    className="absolute -top-2 -right-2 text-xs px-1 py-0"
                  >
                    {feature.badge}
                  </Badge>
                )}
                <div className="flex items-center gap-2">
                  {feature.icon}
                  <span className="font-medium text-sm hidden sm:inline">{feature.label}</span>
                </div>
                <span className="text-xs text-muted-foreground text-center hidden md:block">
                  {feature.description}
                </span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Feature Content */}
      <div className="min-h-[600px]">
        {activeFeature === "ai-tools" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5 text-primary" />
                  AI Evidence Analyzer
                </CardTitle>
                <CardDescription>
                  Transform research papers into actionable clinical insights using advanced AI
                </CardDescription>
              </CardHeader>
            </Card>
            <AISummarizer />
          </div>
        )}

        {activeFeature === "chatgpt" && (
          <div className="space-y-6">
            <ChatGPTInterface />
          </div>
        )}

        {activeFeature === "realtime-chat" && (
          <div className="space-y-6">
            <VoiceChat />
          </div>
        )}

        {activeFeature === "anatomy-3d" && (
          <div className="space-y-6">
            <ZygoteBodyViewer />
          </div>
        )}

        {activeFeature === "analytics" && (
          <div className="space-y-6">
            <AddSessionForm />
            <EnhancedAnalyticsDashboard />
          </div>
        )}

        {activeFeature === "notifications" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary" />
                  Smart Notifications
                </CardTitle>
                <CardDescription>
                  Stay updated with personalized research alerts, system updates, and important announcements
                </CardDescription>
              </CardHeader>
            </Card>
            <NotificationCenter />
          </div>
        )}

        {activeFeature === "study-groups" && (
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Professional Study Groups
                </CardTitle>
                <CardDescription>
                  Join collaborative learning communities and engage in peer-to-peer professional development
                </CardDescription>
              </CardHeader>
            </Card>
            <StudyGroups />
          </div>
        )}
      </div>
        </div>
      </main>
    </div>
  );
};