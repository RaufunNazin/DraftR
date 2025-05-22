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
  Gamepad2,
  Shield,
  Clock,
  LineChart,
} from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/80 flex flex-col">
      {/* Hero Section */}
      <header className="container mx-auto py-24 px-6 flex flex-col items-center text-center">
        <h1 className="text-6xl md:text-8xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-red-500 via-pink-500 to-purple-600 drop-shadow-md tracking-tight mb-6">
          Draftr
        </h1>

        <p className="text-2xl md:text-3xl font-medium text-muted-foreground max-w-3xl mb-4">
          The Real-Time Esports Auction Platform
        </p>

        <p className="text-sm md:text-base text-muted-foreground font-light">
          Now live for{" "}
          <span className="text-[#ff4654] font-semibold">VALORANT</span> — more
          games coming soon.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row gap-4">
          <Button
            asChild
            size="lg"
            className="bg-gradient-to-r from-red-500 via-pink-500 to-purple-600 hover:from-red-600 hover:to-purple-700 text-white shadow-lg transition-all duration-200"
          >
            <Link href="/dashboard" className="flex items-center gap-2">
              Get Started
              <ArrowRight className="h-5 w-5" />
            </Link>
          </Button>
        </div>
      </header>

      {/* Features Section */}
      <section className="container mx-auto py-16 px-4">
        <h2 className="text-3xl font-light text-center mb-12 uppercase">
          Platform Features
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Card className="border-purple-500/20 shadow-lg hover:shadow-purple-500/20 transition-all duration-200">
            <CardHeader className="flex flex-row justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-purple-500" />
                Tournament Hosting
              </CardTitle>
              <div className="bg-transparent border-gray-500/80 border text-gray-500/80 px-3 rounded-md w-fit mt-2">
                Upcoming
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Create and manage <strong>tournaments</strong> with custom
                settings, tournament <strong>brackets</strong>, and team{" "}
                <strong>formations</strong>.
              </p>
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
                <strong>Real-time auction system</strong> for captains to{" "}
                <strong>bid</strong> on players with intuitive controls and{" "}
                <strong>instant updates</strong>.
              </p>
            </CardContent>
          </Card>

          <Card className="border-purple-500/20 shadow-lg hover:shadow-purple-500/20 transition-all duration-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gamepad2 className="h-5 w-5 text-purple-500" />
                Game-Specific Tailoring
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Built with popular <strong>competitive games</strong> in mind.
                Currently optimized for
                <strong> Valorant</strong>, with support for more titles{" "}
                <strong>coming soon</strong>.
              </p>
            </CardContent>
          </Card>

          <Card className="border-green-500/20 shadow-lg hover:shadow-green-500/20 transition-all duration-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-green-500" />
                Role-Based Access
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Different <strong>access levels</strong> for admins, hosts,
                captains, and audience members for
                <strong> secure</strong> tournament control.
              </p>
            </CardContent>
          </Card>

          <Card className="border-yellow-500/20 shadow-lg hover:shadow-yellow-500/20 transition-all duration-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-yellow-500" />
                Real-time Updates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                <strong>Instant updates</strong> for bids, team formations, and
                tournament events through
                <strong> web socket connections</strong>.
              </p>
            </CardContent>
          </Card>

          <Card className="border-cyan-500/20 shadow-lg hover:shadow-cyan-500/20 transition-all duration-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LineChart className="h-5 w-5 text-cyan-500" />
                Auction Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Track <strong>bid history</strong>,{" "}
                <strong>team budget management</strong>, and
                <strong> player value statistics</strong> throughout the
                tournament.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto py-16 px-4">
        <div className="bg-gradient-to-r from-purple-500/10 to-red-500/10 rounded-lg p-8 flex flex-col items-center">
          <h2 className="text-3xl font-light text-center mb-4 uppercase">
            Ready to host an <strong>auction</strong>?
          </h2>
          <p className="text-center text-muted-foreground max-w-2xl mb-8">
            Join thousands of Esports enthusiasts and run your own custom
            <strong className="text-foreground font-medium">
              {" "}
              player auction{" "}
            </strong>
            experience — full tournament support coming soon.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
            <Card className="flex flex-col justify-between border-red-500/20 shadow-lg hover:shadow-red-500/5 transition-all duration-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-red-500" />
                  Join Tournament
                </CardTitle>
                <CardDescription>Join as audience or captain</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Use a <strong>tournament code</strong> to join live and
                  participate as a bidder or spectator.
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

            <Card className="flex flex-col justify-between border-blue-500/20 shadow-lg hover:shadow-blue-500/5 transition-all duration-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-blue-500" />
                  Tournament Dashboard
                </CardTitle>
                <CardDescription>Manage your tournaments</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  View and manage your hosted tournaments, track bids, and monitor
                  player selections in real-time.
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
          <p className="text-muted-foreground">
            Draftr &copy; {new Date().getFullYear()} ~{" "}
            <span className="italic">by RaX</span>
          </p>
          <div className="flex gap-6 mt-4 md:mt-0">
            <Link
              href="#"
              className="text-muted-foreground hover:text-foreground"
            >
              About
            </Link>
            <Link
              href="#"
              className="text-muted-foreground hover:text-foreground"
            >
              Terms
            </Link>
            <Link
              href="#"
              className="text-muted-foreground hover:text-foreground"
            >
              Privacy
            </Link>
            <Link
              href="#"
              className="text-muted-foreground hover:text-foreground"
            >
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
