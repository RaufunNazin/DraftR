import type { Metadata } from "next"
import "./globals.css"
import { Providers } from "@/components/providers"
import { ToastContainer, Flip } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export const metadata: Metadata = {
  title: "Draftr",
  description: "Real-time Player Auction",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
      <ToastContainer
        position="top-right"
        autoClose={2000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss={false}
        draggable
        pauseOnHover={false}
        theme="dark"
        transition={Flip}
      />
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
