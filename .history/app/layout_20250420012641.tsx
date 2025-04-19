import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "TCG Proxy Creator",
  description: "Create high-quality proxy cards for trading card games",
  generator: 'v0.dev',
  icons: {
    icon: '/logo/proxy_creator_logo.png', // Add favicon link
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#000000" />
      </head>
      <body className={inter.className}>
        {/* ① 「system を無効」にし ② デフォルトを固定 */}
        <ThemeProvider
          attribute="class"
          defaultTheme="light"   // ← 固定値に
          enableSystem={false}  // ← system を無効に
          disableTransitionOnChange // Keep this if it was intended
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
