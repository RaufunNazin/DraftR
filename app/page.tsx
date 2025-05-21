import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { 
  ArrowRight, 
  Users, 
  Gavel, 
  Trophy,
  Eye, 
  Shield, 
  Clock,
  LineChart 
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/80 flex flex-col">
      {/* Hero Section */}
      <header className="container mx-auto py-16 px-4 flex flex-col items-center">
        <h1 className="text-5xl md:text-7xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-red-500 to-purple-600 mb-6">
          Draftr
        </h1>
        <p className="text-xl md:text-2xl text-center text-muted-foreground max-w-2xl mb-8">
          Real-time Esports Tournament Auction Hosting Platform
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Button asChild size="lg" className="bg-gradient-to-l from-red-500 to-purple-600 hover:from-red-600 hover:to-purple-700 text-black">
            <Link href="/register">
              Get Started
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="/login">
              Sign In
            </Link>
          </Button>
        </div>
      </header>

      {/* Features Section */}
      <section className="container mx-auto py-16 px-4">
        <h2 className="text-3xl font-bold text-center mb-12">Platform Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Card className="border-purple-500/20 shadow-lg hover:shadow-purple-500/5 transition-all duration-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-purple-500" />
                Tournament Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Create and manage tournaments with custom settings, player rosters, and team formations.
              </p>
              <div className="bg-green-500/10 border-green-500/80 border text-green-500/80 px-3 rounded-md w-fit mt-2">Coming Soon</div>
            </CardContent>
          </Card>
          
          <Card className="border-red-500/20 shadow-lg shadow-red-500/20 transition-all duration-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gavel className="h-5 w-5 text-red-500" />
                Live Auctions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Real-time auction system for captains to bid on players with intuitive controls and instant updates.
              </p>
            </CardContent>
          </Card>
          
          <Card className="border-blue-500/20 shadow-lg hover:shadow-blue-500/5 transition-all duration-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-500" />
                Team Building
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Captains can build balanced teams through strategic bidding, with tier-based player classification.
              </p>
            </CardContent>
          </Card>
          
          <Card className="border-green-500/20 shadow-lg hover:shadow-green-500/5 transition-all duration-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-green-500" />
                Role-Based Access
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Different access levels for admins, hosts, captains, and audience members for secure tournament control.
              </p>
            </CardContent>
          </Card>
          
          <Card className="border-yellow-500/20 shadow-lg hover:shadow-yellow-500/5 transition-all duration-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-500" />
                Real-time Updates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Instant updates for bids, team formations, and tournament events through web socket connections.
              </p>
            </CardContent>
          </Card>
          
          <Card className="border-cyan-500/20 shadow-lg hover:shadow-cyan-500/5 transition-all duration-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LineChart className="h-5 w-5 text-cyan-500" />
                Auction Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Track bid history, team budget management, and player value statistics throughout the tournament.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto py-16 px-4">
        <div className="bg-gradient-to-r from-purple-500/10 to-red-500/10 rounded-lg p-8 flex flex-col items-center">
          <h2 className="text-3xl font-bold text-center mb-4">Ready to host an auction?</h2>
          <p className="text-center text-muted-foreground max-w-2xl mb-8">
            Join thousands of Esports enthusiasts and create your own custom tournament auction experience.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
            <Card className="flex flex-col justify-between border-red-500/20 shadow-lg hover:shadow-red-500/5 transition-all duration-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-red-500" />
                  Join Tournament
                </CardTitle>
                <CardDescription>
                  Join as audience or captain
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Enter a tournament code to join and watch the auction in real-time.
                </p>
              </CardContent>
              <CardFooter>
                <Link href="/join" className="w-full">
                  <Button className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-black">
                    Join Tournament
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardFooter>
            </Card>

            <Card className="flex flex-col justify-between border-purple-500/20 shadow-lg hover:shadow-purple-500/5 transition-all duration-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gavel className="h-5 w-5 text-purple-500" />
                  Create Tournament
                </CardTitle>
                <CardDescription>
                  Create a new tournament
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Set up a new tournament, add players and captains, and manage the auction as an admin.
                </p>
              </CardContent>
              <CardFooter>
                <Link href="/admin" className="w-full">
                  <Button className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-black">
                    Create Tournament
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardFooter>
            </Card>
            
            <Card className="flex flex-col justify-between border-blue-500/20 shadow-lg hover:shadow-blue-500/5 transition-all duration-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-blue-500" />
                  Dashboard
                </CardTitle>
                <CardDescription>
                  Access your tournaments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  View all your tournaments, manage team formations, and track auction progress.
                </p>
              </CardContent>
              <CardFooter>
                <Link href="/dashboard" className="w-full">
                  <Button className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-black">
                    Go to Dashboard
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          </div>
        </div>
      </section>

      <footer className="container mx-auto py-8 px-4 border-t border-muted">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <p className="text-muted-foreground">Draftr &copy; {new Date().getFullYear()}</p>
          <div className="flex gap-6 mt-4 md:mt-0">
            <Link href="/about" className="text-muted-foreground hover:text-foreground">About</Link>
            <Link href="/terms" className="text-muted-foreground hover:text-foreground">Terms</Link>
            <Link href="/privacy" className="text-muted-foreground hover:text-foreground">Privacy</Link>
            <Link href="/contact" className="text-muted-foreground hover:text-foreground">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}