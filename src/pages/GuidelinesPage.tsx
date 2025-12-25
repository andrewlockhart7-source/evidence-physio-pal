import { Header } from "@/components/Header";
import { ClinicalGuidelinesLibrary } from "@/components/guidelines/ClinicalGuidelinesLibrary";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";

const GuidelinesPage = () => {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ErrorBoundary>
          <ClinicalGuidelinesLibrary />
        </ErrorBoundary>
      </main>
    </div>
  );
};

export default GuidelinesPage;