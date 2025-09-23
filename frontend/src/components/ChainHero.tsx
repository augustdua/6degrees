import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, Users, Link, Award } from "lucide-react";
import heroImage from "@/assets/hero-network.jpg";

export default function ChainHero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center bg-gradient-subtle overflow-hidden">
      {/* Background Hero Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-10"
        style={{ backgroundImage: `url(${heroImage})` }}
      />
      
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-20">
          <Users className="w-8 h-8 text-primary opacity-20" />
        </div>
        <div className="absolute top-40 right-32">
          <Link className="w-6 h-6 text-accent opacity-25" />
        </div>
        <div className="absolute bottom-32 left-32">
          <Award className="w-7 h-7 text-success opacity-20" />
        </div>
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Main Headline */}
          <h1 className="text-6xl md:text-7xl font-bold mb-8 bg-gradient-hero bg-clip-text text-transparent leading-tight">
            Chain Your Way to Any Connection
          </h1>
          
          {/* Subheadline */}
          <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-3xl mx-auto leading-relaxed">
            Turn your network into a powerful chain. Create requests, share links, build connections, and reward everyone who helps make it happen.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-6 justify-center mb-16">
            <Button variant="hero" size="lg" className="text-lg px-8 py-4">
              Start Your First Chain
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button variant="outline" size="lg" className="text-lg px-8 py-4 border-primary/20 hover:border-primary">
              See How It Works
            </Button>
          </div>

          {/* How It Works Preview Cards */}
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <Card className="p-8 shadow-network hover:shadow-glow transition-all duration-300">
              <div className="w-16 h-16 bg-gradient-network rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Users className="w-8 h-8 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-4">Create Request</h3>
              <p className="text-muted-foreground">
                Say who you want to connect with and get a shareable link to spread through your network.
              </p>
            </Card>

            <Card className="p-8 shadow-network hover:shadow-glow transition-all duration-300">
              <div className="w-16 h-16 bg-gradient-hero rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Link className="w-8 h-8 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-4">Build the Chain</h3>
              <p className="text-muted-foreground">
                Each person forwards, targets, or suggests connections, creating a chain until it reaches your target.
              </p>
            </Card>

            <Card className="p-8 shadow-success hover:shadow-glow transition-all duration-300">
              <div className="w-16 h-16 bg-gradient-success rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Award className="w-8 h-8 text-success-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-4">Everyone Wins</h3>
              <p className="text-muted-foreground">
                When the connection succeeds, everyone in the winning chain gets rewarded for their contribution.
              </p>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}