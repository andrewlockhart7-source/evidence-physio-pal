import { SecurityDashboard } from "@/components/security/SecurityDashboard";
import { Header } from "@/components/Header";

export default function SecurityPage() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <SecurityDashboard />
      </main>
    </div>
  );
}