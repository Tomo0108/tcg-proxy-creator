"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Header } from "@/components/header"
import { Toaster } from "@/components/toaster"
import { useTranslation } from "@/lib/i18n"
import { IntegratedCardEditor } from "@/components/integrated-card-editor"
import { useMobileDetect } from "@/hooks/use-mobile"

export default function CreatePage() {
  const { t } = useTranslation()
  const [cardType, setCardType] = useState("pokemon")
  const [spacing, setSpacing] = useState(5)
  const [cmykConversion, setCmykConversion] = useState(true)
  const [cards, setCards] = useState(Array(9).fill(null))
  const [exportQuality, setExportQuality] = useState<"standard" | "high" | "ultra">("high") // Add exportQuality state
  const isMobile = useMobileDetect()

  // Handle card creation or update
  const handleCardUpdate = (card: any, index: number) => {
    const newCards = [...cards]
    newCards[index] = card
    setCards(newCards)
  }

  // Handle card removal
  const handleCardRemove = (index: number) => {
    const newCards = [...cards]
    newCards[index] = null
    setCards(newCards)
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="container mx-auto p-4 max-w-7xl flex-1">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">{t("create.title")}</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Settings Panel - Left Side */}
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-4">{t("create.settings.title")}</h2>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="card-type">{t("settings.cardType")}</Label>
                    <Select value={cardType} onValueChange={setCardType}>
                      <SelectTrigger id="card-type">
                        <SelectValue placeholder={t("settings.cardType")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pokemon">{t("card.pokemon")}</SelectItem>
                        <SelectItem value="yugioh">{t("card.yugioh")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Moved Quality setting here */}
                  <div>
                    <Label htmlFor="export-quality">Quality</Label> {/* Changed label */}
                    <Select value={exportQuality} onValueChange={(value) => setExportQuality(value as any)}>
                      <SelectTrigger id="export-quality">
                        <SelectValue placeholder="Quality" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="standard">標準 (300 DPI)</SelectItem>
                        <SelectItem value="high">高品質 (450 DPI)</SelectItem>
                        <SelectItem value="ultra">超高品質 (600 DPI)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="spacing-slider">{t("settings.spacing")}</Label>
                    <Slider
                      id="spacing-slider"
                      min={0}
                      max={20}
                      step={1}
                      value={[spacing]}
                      onValueChange={(value) => setSpacing(value[0])}
                      className="mt-2"
                    />
                    <p className="text-sm text-muted-foreground mt-1">{spacing}mm</p>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="cmyk-switch">{t("settings.cmyk")}</Label>
                    <Switch id="cmyk-switch" checked={cmykConversion} onCheckedChange={setCmykConversion} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="text-sm text-muted-foreground">
              <p>
                • {t("layout.info.cardType")}: {cardType === "pokemon" ? t("card.pokemon") : t("card.yugioh")}
              </p>
              <p>
                • {t("layout.info.spacing")}: {spacing}mm
              </p>
              <p>
                • {t("layout.info.cmyk")}: {cmykConversion ? t("enabled") : t("disabled")}
              </p>
              <p className="mt-2 text-xs">• A4サイズ: 210mm × 297mm（実際の物理サイズで出力されます）</p>
            </div>
          </div>

          {/* Integrated Card Editor - Right Side */}
          <div className="lg:col-span-3">
            <IntegratedCardEditor
              cardType={cardType}
              spacing={spacing}
              cmykConversion={cmykConversion}
              cards={cards}
              onCardUpdate={handleCardUpdate}
              onCardRemove={handleCardRemove}
              exportQuality={exportQuality} // Pass exportQuality prop
            />
          </div>
        </div>
      </div>
      <Toaster />
    </div>
  )
}
