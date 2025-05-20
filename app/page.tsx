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
import { ArrowRight, Users, Gavel, Plus } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/80 flex flex-col">
      <header className="container mx-auto py-6">
        <h1 className="text-4xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-red-500 to-purple-600">
          DraftR
        </h1>
      </header>

      <main className="container mx-auto flex-1 flex items-center justify-center p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full max-w-5xl">
          <Card className="border-red-500/20 shadow-lg hover:shadow-red-500/5 transition-all">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-red-500" />
                Join Tournament
              </CardTitle>
              <CardDescription>
                Join an existing tournament as audience
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Enter a tournament code to join as an audience member and watch
                the auction in real-time.
              </p>
            </CardContent>
            <CardFooter>
              <Link href="/join" className="w-full">
                <Button className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700">
                  Join Tournament
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardFooter>
          </Card>

          <Card className="border-purple-500/20 shadow-lg hover:shadow-purple-500/5 transition-all">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gavel className="h-5 w-5 text-purple-500" />
                Create Tournament
              </CardTitle>
              <CardDescription>
                Create a new tournament as admin
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Set up a new tournament, add players and captains, and manage
                the auction as an admin.
              </p>
            </CardContent>
            <CardFooter>
              <Link href="/admin" className="w-full">
                <Button className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700">
                  Create Tournament
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardFooter>
          </Card>

          <Card className="border-blue-500/20 shadow-lg hover:shadow-blue-500/5 transition-all">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-blue-500" />
                Register Players
              </CardTitle>
              <CardDescription>Add players to the auction pool</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Register players with their roles, tiers, and preferred agents
                for the tournament.
              </p>
            </CardContent>
            <CardFooter>
              <Link href={`/admin/tournaments/WF9G`} className="w-full">
                <Button className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700">
                  Register Players
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </div>
      </main>

      <footer className="container mx-auto py-6 text-center text-sm text-muted-foreground">
        <p>DraftR &copy; {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}
