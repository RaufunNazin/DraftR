"use client"

import { createContext, useContext, useEffect, type ReactNode } from "react"
import { useSocketStore } from "@/lib/socket"

interface SocketContextType {
  isConnected: boolean
  error: string | null
  joinTournament: (code: string) => void
}

const SocketContext = createContext<SocketContextType | undefined>(undefined)

export function SocketProvider({ children }: { children: ReactNode }) {
  const { connect, disconnect, isConnected, error, joinTournament } = useSocketStore()

  // Connect to socket on mount
  useEffect(() => {
    connect()

    // Disconnect on unmount
    return () => {
      disconnect()
    }
  }, [connect, disconnect])

  return <SocketContext.Provider value={{ isConnected, error: error ?? null, joinTournament }}>{children}</SocketContext.Provider>
}

export function useSocket() {
  const context = useContext(SocketContext)
  if (context === undefined) {
    throw new Error("useSocket must be used within a SocketProvider")
  }
  return context
}
