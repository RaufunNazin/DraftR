import type React from "react"
import type { Metadata } from "next"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { SocketProvider } from "@/components/socket-provider"

export const metadata: Metadata = {
  title: "Valorant Team Auction",
  description: "Real-time Valorant Tournament Auction UI",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <SocketProvider>{children}</SocketProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
