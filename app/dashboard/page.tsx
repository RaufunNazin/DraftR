"use client";

import type React from "react";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Trophy, Users } from "lucide-react";
import { getTournaments, joinTournamentByCode } from "@/lib/actions/tournament";
import type { Tournament } from "@/lib/types";

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const { toast } = useToast();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tournamentCode, setTournamentCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated") {
      loadTournaments();
    }
  }, [status, router]);

  const loadTournaments = async () => {
    setIsLoading(true);
    try {
      const result = await getTournaments();
      if (result.success) {
        setTournaments(result.tournaments ?? []);
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to load tournaments",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load tournaments",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsJoining(true);

    try {
      const result = await joinTournamentByCode(tournamentCode);
      if (result.success) {
        toast({
          title: "Success",
          description: "You have joined the tournament",
        });
        router.push(`/auction?tournament=${tournamentCode}`);
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to join tournament",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to join tournament",
        variant: "destructive",
      });
    } finally {
      setIsJoining(false);
    }
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/80">
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold">Welcome, {session?.user?.name}</h1>
          <Button
            variant="outline"
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-sm"
          >
            Logout
          </Button>
        </div>
        <Tabs defaultValue="tournaments" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-8">
            <TabsTrigger value="tournaments">My Tournaments</TabsTrigger>
            <TabsTrigger value="join">Join Tournament</TabsTrigger>
          </TabsList>

          <TabsContent value="tournaments">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tournaments.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <Trophy className="h-16 w-16 mx-auto text-muted-foreground opacity-20 mb-4" />
                  <h2 className="text-xl font-semibold mb-2">
                    No Tournaments Yet
                  </h2>
                  <p className="text-muted-foreground mb-6">
                    You haven't joined any tournaments yet.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() =>
                      document
                        .querySelector('[data-value="join"]')
                        ?.dispatchEvent(new MouseEvent("click"))
                    }
                  >
                    Join a Tournament
                  </Button>
                </div>
              ) : (
                tournaments.map((tournament) => (
                  <Card
                    key={tournament.id}
                    className="border-purple-500/20 shadow-lg hover:shadow-purple-500/5"
                  >
                    <CardHeader>
                      <CardTitle>{tournament.name}</CardTitle>
                      <CardDescription>
                        Status:{" "}
                        {tournament.status.charAt(0).toUpperCase() +
                          tournament.status.slice(1)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2 mb-4">
                        <Users className="h-5 w-5 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {tournament.captains?.length || 0} Captains •{" "}
                          {tournament.players?.length || 0} Players
                        </span>
                      </div>
                      <div className="bg-secondary/30 rounded-md px-3 py-2 text-center">
                        <p className="text-xs text-muted-foreground mb-1">
                          Tournament Code
                        </p>
                        <p className="font-mono font-bold tracking-wider">
                          {tournament.code}
                        </p>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button
                        className="w-full"
                        onClick={() =>
                          router.push(`/auction?tournament=${tournament.code}`)
                        }
                      >
                        {tournament.status === "ACTIVE"
                          ? "Join Auction"
                          : "View Tournament"}
                      </Button>
                    </CardFooter>
                  </Card>
                ))
              )}

              {session?.user?.role === "ADMIN" && (
                <Card className="border-dashed border-muted hover:border-muted-foreground/50 transition-colors flex flex-col items-center justify-center h-[300px]">
                  <Button
                    variant="ghost"
                    className="h-full w-full flex flex-col gap-4"
                    onClick={() => router.push("/admin/tournaments/new")}
                  >
                    <Plus className="h-12 w-12 text-muted-foreground" />
                    <span className="text-muted-foreground font-normal">
                      Create New Tournament
                    </span>
                  </Button>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="join">
            <Card className="max-w-md mx-auto border-blue-500/20 shadow-lg">
              <CardHeader>
                <CardTitle>Join Tournament</CardTitle>
                <CardDescription>
                  Enter a tournament code to join
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleJoinTournament}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="code">Tournament Code</Label>
                    <Input
                      id="code"
                      placeholder="Enter 4-character code"
                      value={tournamentCode}
                      onChange={(e) =>
                        setTournamentCode(e.target.value.toUpperCase())
                      }
                      maxLength={4}
                      className="text-center text-xl tracking-widest uppercase"
                      required
                    />
                  </div>
                </CardContent>
                <CardFooter>
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700"
                    disabled={isJoining}
                  >
                    {isJoining ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Joining...
                      </>
                    ) : (
                      "Join Tournament"
                    )}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
