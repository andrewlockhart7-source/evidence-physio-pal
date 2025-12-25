import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { 
  ArrowRight, 
  BookOpen, 
  Brain, 
  FileText, 
  Users, 
  Award,
  Check,
  Search
} from "lucide-react"
import { Link, useNavigate } from "react-router-dom"
import { useAuth } from "@/hooks/useAuth"
import { Header } from "@/components/Header"

const steps = [
  {
    id: 1,
    title: "Welcome to PhysioEvidence",
    description: "Your comprehensive evidence-based physiotherapy platform",
    icon: Brain,
    content: "Access the latest research, clinical guidelines, and treatment protocols all in one place. Let's get you started!",
  },
  {
    id: 2,
    title: "Explore Conditions",
    description: "Browse 21+ evidence-based conditions",
    icon: Search,
    content: "Search through musculoskeletal, respiratory, and neurological conditions with curated evidence from top medical journals.",
    link: "/conditions",
  },
  {
    id: 3,
    title: "Assessment Tools",
    description: "Use validated clinical assessments",
    icon: FileText,
    content: "Access professional assessment tools with scoring guides and interpretation to support your clinical decisions.",
    link: "/assessments",
  },
  {
    id: 4,
    title: "Treatment Protocols",
    description: "Build evidence-based treatment plans",
    icon: BookOpen,
    content: "Create and customize treatment protocols based on the latest research, or use our validated templates.",
    link: "/protocols",
  },
  {
    id: 5,
    title: "Track Your CPD",
    description: "Manage continuing professional development",
    icon: Award,
    content: "Log your CPD activities, track hours, and generate certificates for your professional portfolio.",
    link: "/cpd",
  },
  {
    id: 6,
    title: "Ready to Start!",
    description: "You're all set to use PhysioEvidence",
    icon: Check,
    content: "Start exploring evidence-based resources, or sign in to unlock premium features like patient management and collaboration tools.",
  },
]

export const OnboardingFlow = () => {
  const [currentStep, setCurrentStep] = useState(0)
  const { user } = useAuth()
  const navigate = useNavigate()

  const progress = ((currentStep + 1) / steps.length) * 100
  const step = steps[currentStep]
  const Icon = step.icon

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      navigate("/dashboard")
    }
  }

  const handleSkip = () => {
    navigate("/")
  }

  const handleExploreLink = () => {
    if (step.link) {
      navigate(step.link)
    }
  }

  return (
    <div className="min-h-screen">
      <Header />
      <div className="bg-gradient-to-br from-background to-neutral-50 flex items-center justify-center p-4 min-h-[calc(100vh-4rem)]">
      <div className="w-full max-w-2xl">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-muted-foreground">
              Step {currentStep + 1} of {steps.length}
            </span>
            <Button variant="ghost" size="sm" onClick={handleSkip}>
              Skip Tour
            </Button>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Main Card */}
        <Card className="shadow-lg animate-fade-in">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-4 w-20 h-20 bg-gradient-to-br from-medical-blue to-medical-green rounded-full flex items-center justify-center">
              <Icon className="h-10 w-10 text-white" />
            </div>
            <CardTitle className="text-3xl mb-2">{step.title}</CardTitle>
            <CardDescription className="text-lg">{step.description}</CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <p className="text-center text-muted-foreground leading-relaxed">
              {step.content}
            </p>

            {/* Feature highlights for specific steps */}
            {currentStep === 1 && (
              <div className="grid grid-cols-3 gap-4 pt-4">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-medical-blue">137+</div>
                  <div className="text-xs text-muted-foreground">Evidence Papers</div>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-medical-green">39+</div>
                  <div className="text-xs text-muted-foreground">Conditions</div>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-medical-blue">8+</div>
                  <div className="text-xs text-muted-foreground">Assessment Tools</div>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              {currentStep < steps.length - 1 && (
                <Button 
                  onClick={handleNext} 
                  className="flex-1"
                  size="lg"
                >
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}

              {currentStep === steps.length - 1 && (
                <>
                  {user ? (
                    <Button 
                      onClick={() => navigate("/dashboard")} 
                      className="flex-1"
                      size="lg"
                    >
                      Go to Dashboard
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  ) : (
                    <Button 
                      onClick={() => navigate("/auth")} 
                      className="flex-1"
                      size="lg"
                    >
                      Sign In to Get Started
                      <Users className="ml-2 h-4 w-4" />
                    </Button>
                  )}
                </>
              )}

              {step.link && (
                <Button 
                  onClick={handleExploreLink} 
                  variant="outline"
                  className="flex-1"
                  size="lg"
                >
                  Explore Now
                </Button>
              )}
            </div>

            {/* Navigation dots */}
            <div className="flex justify-center gap-2 pt-4">
              {steps.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentStep(index)}
                  className={`w-2 h-2 rounded-full transition-all ${
                    index === currentStep 
                      ? 'w-8 bg-medical-blue' 
                      : 'bg-muted-foreground/30'
                  }`}
                  aria-label={`Go to step ${index + 1}`}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  )
}
