"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowRight, ImageIcon, Printer, Save } from "lucide-react";
import { Header } from "@/components/header";
import { useTranslation } from "@/lib/i18n";
import { FallingCardsCanvas } from "@/components/FallingCardsCanvas"; // Import the canvas component

export default function Home() {
  const { t } = useTranslation()

  return (
    <div className="flex min-h-screen flex-col">
      <FallingCardsCanvas /> {/* Add the canvas component here */}
      <Header />
      {/* Add relative z-10 to ensure content is above the canvas */}
      <main className="flex-1 relative z-10">
        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl">{t("home.hero.title")}</h2>
                <p className="mx-auto max-w-[700px] text-muted-foreground md:text-xl">{t("home.hero.description")}</p>
              </div>
              <div className="space-x-4">
                <Link href="/create">
                  <Button className="px-8 bg-gold-500 hover:bg-gold-600">
                    {t("home.getStarted")} <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
        <section className="w-full py-12 md:py-24 lg:py-32 bg-muted">
          <div className="container px-4 md:px-6">
            <div className="grid gap-6 lg:grid-cols-3 lg:gap-12">
              <Card>
                <CardContent className="p-6 flex flex-col items-center space-y-4">
                  <div className="p-2 bg-gold-500/10 rounded-full">
                    <ImageIcon className="h-6 w-6 text-gold-500" />
                  </div>
                  <h3 className="text-xl font-bold">{t("home.feature1.title")}</h3>
                  <p className="text-center text-muted-foreground">{t("home.feature1.description")}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 flex flex-col items-center space-y-4">
                  <div className="p-2 bg-gold-500/10 rounded-full">
                    <Printer className="h-6 w-6 text-gold-500" />
                  </div>
                  <h3 className="text-xl font-bold">{t("home.feature2.title")}</h3>
                  <p className="text-center text-muted-foreground">{t("home.feature2.description")}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 flex flex-col items-center space-y-4">
                  <div className="p-2 bg-gold-500/10 rounded-full">
                    <Save className="h-6 w-6 text-gold-500" />
                  </div>
                  <h3 className="text-xl font-bold">{t("home.feature3.title")}</h3>
                  <p className="text-center text-muted-foreground">{t("home.feature3.description")}</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>
      {/* Add a div to mask the footer area */}
      <div
        className="fixed bottom-0 left-0 w-full h-16 bg-background z-0" // Adjust height (h-16 = 4rem = 64px) as needed
        aria-hidden="true" // Accessibility: Hide decorative element
      />
      <footer className="border-t py-6 relative z-10 bg-background"> {/* Ensure footer is above mask and has background */}
        <div className="container flex flex-col items-center justify-between gap-4 px-4 md:flex-row md:px-6">
          <p className="text-sm text-muted-foreground">{t("footer.copyright")}</p>
          <div className="flex items-center gap-4">
            <Link href="/terms" className="text-sm text-muted-foreground underline">
              {t("footer.terms")}
            </Link>
            <Link href="/privacy" className="text-sm text-muted-foreground underline">
              {t("footer.privacy")}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
