"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import Image from "next/image"; // next/image をインポート
import { ArrowRight, ImageIcon, Printer, Save } from "lucide-react";
import { Header } from "@/components/header";
import { useTranslation } from "@/lib/i18n";
import { FallingCardsCanvas } from "@/components/FallingCardsCanvas";
// Removed duplicate import: import { useTranslation } from "@/lib/i18n";

export default function Home() {
  const { t } = useTranslation()

  return (
    <div className="flex min-h-screen flex-col">
      {/* <FallingCardsCanvas /> Removed from here */}
      <Header />
      {/* Removed relative z-10 from main */}
      <main className="flex-1">
        {/* Add relative and overflow-hidden to contain the absolute positioned canvas */}
        <section className="w-full py-12 md:py-24 lg:py-32 relative overflow-hidden">
          {/* Place Canvas inside the section */}
          <FallingCardsCanvas />
          {/* Container z-index raised to ensure it's above canvas, text z-index ensures it's above image */}
          <div className="container px-4 md:px-6 relative z-20"> {/* Changed z-10 to z-20 */}
             {/* Image positioned absolutely within the container, behind text */}
             <Image
               src="/img/penki_gold.png"
               alt="Gold paint splatter"
               fill // layout="fill" の代わりに fill を使用
               className="absolute inset-0 z-0 object-cover pointer-events-none" // object-contain を object-cover に変更
               priority
             />
            {/* Text container with higher z-index to be above the image */}
            <div className="flex flex-col items-center justify-center space-y-4 text-center relative z-10"> {/* Added z-10 */}
              {/* Removed relative from inner div */}
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
      {/* Removed the footer mask div */}
      <footer className="border-t py-6 bg-background"> {/* Removed relative z-10 */}
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
