"use client"

import { useEffect, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useSocketStore } from "@/lib/socket"
import { AuctionRoom } from "@/components/auction/auction-room"
import { SidebarDrawer } from "@/components/auction/sidebar-drawer"
import { HostControls } from "@/components/auction/host-controls"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { getTournamentByCode, joinTournamentByCode } from "@/lib/actions/tournament"
import type { UserRole } from "@/lib/types"

export default function AuctionPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tournamentCode = searchParams.get("tournament")
  const { data: session, status } = useSession()
  const { toast } = useToast()

  const {
    connect,
    joinTournament: joinSocketTournament,
    isConnected,
    auctionState,
    error: socketError,
  } = useSocketStore()

  const [userRole, setUserRole] = useState<UserRole>("AUDIENCE")
  const [selectedCaptainId, setSelectedCaptainId] = useState<string | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [sidebarTab, setSidebarTab] = useState<"roster" | "history">("roster")

  // Check authentication
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push(`/login?callbackUrl=/auction?tournament=${tournamentCode}`)
    }
  }, [status, router, tournamentCode])

  // Initialize socket connection
  useEffect(() => {
    if (status === "authenticated" && !isConnected) {
      connect()
    }
  }, [connect, isConnected, status])

  // Join tournament if code is provided
  useEffect(() => {
    const initializeAuction = async () => {
      if (status === "authenticated" && isConnected && tournamentCode) {
        try {
          console.log("Initializing auction with tournament code:", tournamentCode)
          // Join tournament in database
          const result = await joinTournamentByCode(tournamentCode)

          if (result.success) {
            // Get tournament details
            const tournamentResult = await getTournamentByCode(tournamentCode)

            if (tournamentResult.success) {
              // Set user role based on session
              if (session?.user?.role === "ADMIN") {
                setUserRole("ADMIN")
              } else if (tournamentResult.tournament && tournamentResult.tournament.hostId === session?.user?.id) {
                setUserRole("HOST")
              } else if (tournamentResult.tournament) {
                // Check if user is a captain
                const isCaptain = tournamentResult.tournament.captains.some(
                  (captain) => captain.user.id === session?.user?.id,
                )

                if (isCaptain) {
                  setUserRole("CAPTAIN")
                  // Set selected captain ID
                  const captain = tournamentResult.tournament.captains.find(
                    (captain) => captain.user.id === session?.user?.id,
                  )
                  if (captain) {
                    setSelectedCaptainId(captain.id)
                  }
                } else {
                  setUserRole("AUDIENCE")
                }
              }

              // Join tournament in socket
              console.log("Joining socket tournament with code:", tournamentCode)
              joinSocketTournament(tournamentCode)
            } else {
              toast({
                title: "Error",
                description: tournamentResult.error || "Failed to load tournament details",
                variant: "destructive",
              })
            }
          } else {
            toast({
              title: "Error",
              description: result.error || "Failed to join tournament",
              variant: "destructive",
            })
          }
        } catch (error) {
          console.error("Error initializing auction:", error)
          toast({
            title: "Error",
            description: "Failed to initialize auction",
            variant: "destructive",
          })
        } finally {
          setIsInitializing(false)
        }
      }
    }

    initializeAuction()
  }, [isConnected, tournamentCode, status, session, joinSocketTournament, toast])

  // Handle socket errors
  useEffect(() => {
    if (socketError) {
      toast({
        title: "Connection Error",
        description: socketError,
        variant: "destructive",
      })
    }
  }, [socketError, toast])

  const handleRoleChange = (role: UserRole) => {
    setUserRole(role)
  }

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen)
  }

  if (status === "loading" || isInitializing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <h2 className="text-2xl font-bold">Connecting to Auction...</h2>
        <p className="text-muted-foreground mt-2">Establishing connection to the tournament</p>
      </div>
    )
  }

  if (!tournamentCode) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>No Tournament Selected</CardTitle>
            <CardDescription>Please join a tournament to view the auction</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              You need to join a tournament using a tournament code to access the auction.
            </p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => router.push("/dashboard")} className="w-full">
              Go to Dashboard
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  if (!auctionState) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold mb-4">No Auction Data</h2>
          <p className="text-muted-foreground mb-6">
            Unable to load auction data. Please try again or join a different tournament.
          </p>
          <Button asChild>
            <a href="/dashboard">Return to Dashboard</a>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex flex-1">
        <AuctionRoom
          userRole={userRole}
          selectedCaptainId={selectedCaptainId}
          setSelectedCaptainId={setSelectedCaptainId}
          toggleSidebar={toggleSidebar}
        />
        <SidebarDrawer
          isSidebarOpen={isSidebarOpen}
          toggleSidebar={toggleSidebar}
          sidebarTab={sidebarTab}
          setSidebarTab={setSidebarTab}
        />
      </div>

      {(userRole === "HOST" || userRole === "ADMIN") && <HostControls />}
    </div>
  )
}
