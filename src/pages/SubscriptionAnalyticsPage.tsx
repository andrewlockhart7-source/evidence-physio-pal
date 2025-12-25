import { SubscriptionAnalyticsDashboard } from "@/components/subscription/SubscriptionAnalyticsDashboard";
import { Header } from "@/components/Header";

export default function SubscriptionAnalyticsPage() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <SubscriptionAnalyticsDashboard />
      </main>
    </div>
  );
}