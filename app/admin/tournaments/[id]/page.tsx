"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, Users, Trophy, Copy, Check } from "lucide-react";
import { getTournamentById } from "@/lib/actions/tournament";
import { PlayerRegistration } from "@/components/tournament/player-registration";
import { CaptainManagement } from "@/components/tournament/captain-management";
import type { Tournament } from "@/lib/types";

export default function TournamentDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadTournament();
  }, [params.id]);

  const loadTournament = async () => {
    setIsLoading(true);
    try {
      const result = await getTournamentById(params.id);
      if (result.success && result.tournament) {
        // Map the fetched tournament to ensure 'tier' is of type 'Tier'
        const mappedTournament = {
          ...result.tournament,
          players: result.tournament.players.map((player: any) => ({
            ...player,
            tier: String(player.tier) as any, // or use your Tier enum/casting here
          })),
          captains: result.tournament.captains.map((captain: any) => ({
            ...captain,
            players: captain.players.map((player: any) => ({
              ...player,
              tier: String(player.tier) as any, // or use your Tier enum/casting here
            })),
          })),
          host: {
            id: result.tournament.host.id,
            name: result.tournament.host.name,
            email: result.tournament.host.email,
            role: result.tournament.host.role,
          },
        };
        setTournament(mappedTournament);
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to load tournament",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load tournament",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyTournamentCode = () => {
    if (tournament) {
      navigator.clipboard.writeText(tournament.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Code Copied",
        description: "Tournament code copied to clipboard",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Tournament Not Found</CardTitle>
            <CardDescription>
              The tournament you are looking for does not exist
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => router.push("/dashboard")}>
              Return to Dashboard
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/80">
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center mb-8">
          <Button
            variant="ghost"
            onClick={() => router.push("/dashboard")}
            className="mr-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{tournament.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm text-muted-foreground">
                Tournament Code:
              </span>
              <div className="bg-secondary/30 rounded-md px-2 py-1 flex items-center">
                <span className="font-mono font-bold tracking-wider mr-2">
                  {tournament.code}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={copyTournamentCode}
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
          <div className="ml-auto">
            <Button
              onClick={() =>
                router.push(`/auction?tournament=${tournament.code}`)
              }
              className="bg-gradient-to-r from-red-500 to-purple-600 hover:from-red-600 hover:to-purple-700"
            >
              {tournament.status === "ACTIVE" ? (
                <>
                  <Trophy className="mr-2 h-4 w-4" />
                  Join Auction
                </>
              ) : (
                <>
                  <Users className="mr-2 h-4 w-4" />
                  View Tournament
                </>
              )}
            </Button>
          </div>
        </div>

        <Tabs defaultValue="players" className="w-full">
          <TabsList className="grid w-full max-w-md grid-cols-2 mb-8">
            <TabsTrigger value="players">Players</TabsTrigger>
            <TabsTrigger value="captains">Captains</TabsTrigger>
          </TabsList>

          <TabsContent value="players">
            <PlayerRegistration tournamentId={tournament.id} />
          </TabsContent>

          <TabsContent value="captains">
            <CaptainManagement tournamentId={tournament.id} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
