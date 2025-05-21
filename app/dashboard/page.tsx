"use client";

import type React from "react";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Separator } from "@/components/ui/separator";
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
import { Loader2, Plus, Trophy, Users, Trash2 } from "lucide-react";
import {
  getTournaments,
  joinTournamentByCode,
  createTournament,
  deleteTournament,
} from "@/lib/actions/tournament";
import type { Tournament } from "@/lib/types";
import { toast } from "react-toastify";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function DashboardPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tournamentCode, setTournamentCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);

  // New tournament modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTournamentName, setNewTournamentName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

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
        setTournaments(
          (result.tournaments ?? []).map((tournament: any) => ({
            ...tournament,
            players: (tournament.players ?? []).map((player: any) => ({
              agents: [],
              ...player,
            })),
          }))
        );
      } else {
        toast.error(result.error || "Failed to load tournaments");
      }
    } catch (error) {
      toast.error("Failed to load tournaments");
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
        toast.success("You have joined the tournament");
        router.push(`/auction?tournament=${tournamentCode}`);
      } else {
        toast.error(result.error || "Failed to join tournament");
      }
    } catch (error) {
      toast.error("Failed to join tournament");
    } finally {
      setIsJoining(false);
    }
  };

  const handleCreateTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);

    try {
      const result = await createTournament(newTournamentName);

      if (result.success) {
        toast.success(
          `Tournament "${newTournamentName}" created with code ${result.code}`
        );
        setIsModalOpen(false);
        setNewTournamentName("");
        await loadTournaments(); // Reload tournaments to show the new one
      } else {
        toast.error(result.error || "Failed to create tournament");
      }
    } catch (error) {
      toast.error("Failed to create tournament");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteTournament = async (id: string) => {
    setIsDeletingId(id);
    try {
      const result = await deleteTournament(id);
      if (result.success) {
        toast.success("The tournament has been deleted successfully.");
        await loadTournaments();
      } else {
        toast.error(result.error || "Failed to delete tournament");
      }
    } catch (error) {
      toast.error("Failed to delete tournament");
    } finally {
      setIsDeletingId(null);
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
          <h1 className="text-2xl font-light">
            Welcome,{" "}
            <span className="font-semibold">{session?.user?.name}</span>!
          </h1>
          <div className="flex items-center gap-2">
            {status == "authenticated" && (
              <Button
                variant="outline"
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="text-sm hover:border-red-600/50 hover:bg-transparent hover:shadow-sm hover:shadow-red-600/50 transition-all duration-200"
              >
                Logout
              </Button>
            )}
          </div>
        </div>

        {/* Tournaments Section */}
        <div>
          <h2 className="text-2xl font-light mb-6 text-center">
            ALL TOURNAMENTS
          </h2>
          <Separator className="mb-4" />
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
              </div>
            ) : (
              tournaments.map((tournament) => (
                <Card
                  key={tournament.id}
                  className="flex flex-col justify-between border-purple-500/20 shadow-lg hover:shadow-purple-500/5"
                >
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>{tournament.name}</CardTitle>
                      <CardDescription>
                        Status:{" "}
                        <span
                          className={`${
                            tournament.status == "UPCOMING"
                              ? "text-yellow-500/80"
                              : tournament.status == "ACTIVE"
                              ? "text-blue-500/80"
                              : "text-green-500/80"
                          }`}
                        >
                          {tournament.status}
                        </span>
                      </CardDescription>
                    </div>
                    {session?.user?.role == "ADMIN" && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDeleteTournament(tournament.id)}
                        disabled={isDeletingId === tournament.id}
                        className="max-w-fit"
                      >
                        {isDeletingId === tournament.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    )}
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
                  <CardFooter className="flex flex-row items-center gap-2">
                    <Button
                      className={`${
                        tournament.status == "UPCOMING"
                          ? "border border-yellow-500/80 text-yellow-500/80 hover:bg-yellow-500/5"
                          : tournament.status == "ACTIVE"
                          ? "border border-blue-500/80 text-blue-500/80 hover:bg-blue-500/5"
                          : "border border-green-500/80 text-green-500/80 hover:bg-green-500/5"
                      } bg-transparent w-full transition-all duration-200`}
                      onClick={() =>
                        router.push(`/auction?tournament=${tournament.code}`)
                      }
                    >
                      {tournament.status === "ACTIVE"
                        ? "Join Auction"
                        : tournament.status === "UPCOMING"
                        ? "Join The Lobby"
                        : "View Final Teams"}
                    </Button>
                    {session?.user?.role == "ADMIN" && (
                      <Button
                        variant="outline"
                        onClick={() =>
                          router.push(`/admin/tournaments/${tournament.id}`)
                        }
                      >
                        Manage
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              ))
            )}

            {/* Join Tournament Card */}
            <Card className="flex flex-col justify-between border-blue-500/20 shadow-lg hover:shadow-blue-500/5">
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
                    className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-black"
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

            {/* Create Tournament Card (Admin only) */}
            {session?.user?.role === "ADMIN" && (
              <Card className="border-dashed border-muted hover:border-muted-foreground/50 transition-colors flex flex-col items-center justify-center shadow-lg hover:shadow-gray-500/5">
                <Button
                  variant="ghost"
                  className="h-full w-full flex flex-col gap-4 py-8"
                  onClick={() => setIsModalOpen(true)}
                >
                  <Plus className="h-12 w-12 text-muted-foreground" />
                  <span className="text-muted-foreground font-normal">
                    Create New Tournament
                  </span>
                </Button>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Create Tournament Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create New Tournament</DialogTitle>
            <DialogDescription>
              Set up a new Esports auction tournament
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateTournament}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Tournament Name</Label>
                <Input
                  id="name"
                  placeholder="Enter tournament name"
                  value={newTournamentName}
                  onChange={(e) => setNewTournamentName(e.target.value)}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                type="button"
                onClick={() => setIsModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700"
                disabled={isCreating}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Tournament"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
