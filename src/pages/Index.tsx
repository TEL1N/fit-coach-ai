import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { Dumbbell, Sparkles, Calendar, TrendingUp, ArrowRight } from "lucide-react";
import mobileHero from "@/assets/mobile-hero.jpg";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section - Mobile Optimized */}
      <section className="relative min-h-screen flex flex-col">
        <div 
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: `url(${mobileHero})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/90 to-background" />
        </div>
        
        <div className="relative z-10 flex flex-col flex-1 px-6 pt-16 pb-8 safe-area-top safe-area-bottom">
          {/* Logo */}
          <div className="flex items-center gap-2 mb-8">
            <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
              <Dumbbell className="w-5 h-5 text-primary" />
            </div>
            <span className="text-xl font-bold">TailorFit</span>
          </div>

          {/* Hero Content */}
          <div className="flex-1 flex flex-col justify-center">
            <h1 className="text-5xl font-bold mb-4 leading-tight">
              Your AI<br />Fitness<br />Coach
            </h1>
            <p className="text-lg text-foreground/80 mb-8 max-w-sm">
              Get personalized workout plans through intelligent conversation.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="space-y-3">
            <Link to="/auth" className="block">
              <Button size="lg" className="w-full h-14 text-base rounded-2xl shadow-lg">
                Get Started Free
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Link to="/auth" className="block text-center">
              <Button variant="ghost" size="lg" className="w-full h-14 text-base rounded-2xl">
                Already have an account? Sign in
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-6 py-12 bg-card">
        <h2 className="text-3xl font-bold mb-8 text-center">
          How It Works
        </h2>
        
        <div className="space-y-4 max-w-md mx-auto">
          <Card className="p-6">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Chat with AI</h3>
            <p className="text-muted-foreground">
              Discuss your goals, experience, and equipment with your personal AI coach.
            </p>
          </Card>

          <Card className="p-6">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
              <Dumbbell className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Get Your Plan</h3>
            <p className="text-muted-foreground">
              Receive a personalized workout program designed specifically for you.
            </p>
          </Card>

          <Card className="p-6">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
              <Calendar className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Track Progress</h3>
            <p className="text-muted-foreground">
              Follow your workouts with visual guides and track your improvements.
            </p>
          </Card>

          <Card className="p-6">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
              <TrendingUp className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Achieve Goals</h3>
            <p className="text-muted-foreground">
              Stay motivated with gamification and reach your fitness milestones.
            </p>
          </Card>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-6 py-16 text-center">
        <h2 className="text-3xl font-bold mb-4">
          Ready to Start?
        </h2>
        <p className="text-lg text-muted-foreground mb-8 max-w-md mx-auto">
          Join thousands achieving their fitness goals with AI coaching.
        </p>
        <Link to="/auth">
          <Button size="lg" className="w-full max-w-sm h-14 text-base rounded-2xl shadow-lg">
            Create Your Account
          </Button>
        </Link>
      </section>

      {/* Footer */}
      <footer className="py-6 border-t border-border safe-area-bottom">
        <div className="px-6 text-center text-sm text-muted-foreground">
          <p>&copy; 2025 TailorFit. Your AI-powered fitness journey.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;