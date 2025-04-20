"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Switch } from "@/components/ui/switch"
import { Download } from "lucide-react"
import { generatePDF, generatePNG } from "@/lib/pdf-generator"
import { toast } from "@/components/ui/use-toast"
import { useTranslation } from "@/lib/i18n"

interface ExportOptionsProps {
  cmykEnabled: boolean
}

export function ExportOptions({ cmykEnabled }: ExportOptionsProps) {
  const { t } = useTranslation()
  const [exportFormat, setExportFormat] = useState("pdf")
  const [highResolution, setHighResolution] = useState(true)
  const [isExporting, setIsExporting] = useState(false)
  const [exportQuality, setExportQuality] = useState<"standard" | "high" | "ultra">("high")

  // Get DPI based on quality setting
  const getDpiForQuality = () => {
    switch (exportQuality) {
      case "standard":
        return 300
      case "high":
        return 450
      case "ultra":
        return 600
      default:
        return 350
    }
  }

  const handleExport = async () => {
    // Get the print layout canvas
    const printLayoutCanvas = document.querySelector("#print-layout-canvas") as HTMLCanvasElement

    if (!printLayoutCanvas) {
      toast({
        title: t("toast.exportError"),
        description:
          t("toast.exportErrorDesc") + "Print layout canvas not found. Please open the Print Layout tab first.",
        variant: "destructive",
      })
      return
    }

    setIsExporting(true)

    try {
      // Show toast for high quality export
      if (exportQuality === "ultra") {
        toast({
          title: "高品質出力処理中",
          description: "高解像度ファイルの生成には時間がかかる場合があります。しばらくお待ちください。",
        })
      }

      // Export options
      const options = {
        cards: [], // This would be populated with actual card data
        spacing: 5,
        cardType: "pokemon",
        cmykConversion: cmykEnabled,
        dpi: getDpiForQuality(),
        canvas: printLayoutCanvas,
      }

      let blob

      if (exportFormat === "pdf") {
        blob = await generatePDF(options)
        downloadFile(blob, "tcg-proxy-cards.pdf")
        toast({
          title: t("toast.pdfSuccess"),
          description: t("toast.pdfSuccessDesc"),
        })
      } else {
        blob = await generatePNG(options)
        downloadFile(blob, "tcg-proxy-cards.png")
        toast({
          title: t("toast.pngSuccess"),
          description: t("toast.pngSuccessDesc"),
        })
      }
    } catch (error) {
      console.error("Export failed:", error)
      toast({
        title: t("toast.exportError"),
        description: `${t("toast.exportErrorDesc")}${error instanceof Error ? error.message : "unknown error"}`,
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
    }
  }

  const downloadFile = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="text-xl font-semibold mb-4">{t("create.export.title")}</h2>

        <div className="space-y-4">
          <div>
            <Label className="mb-2 block">{t("export.format")}</Label>
            <RadioGroup value={exportFormat} onValueChange={setExportFormat}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="pdf" id="pdf" />
                <Label htmlFor="pdf">PDF</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="png" id="png" />
                <Label htmlFor="png">PNG</Label>
              </div>
            </RadioGroup>
          </div>

          <div>
            <Label className="mb-2 block">出力品質</Label>
            <select
              className="w-full p-2 border rounded bg-background"
              value={exportQuality}
              onChange={(e) => setExportQuality(e.target.value as any)}
            >
              <option value="standard">標準 (300 DPI)</option>
              <option value="high">高品質 (450 DPI)</option>
              <option value="ultra">超高品質 (600 DPI)</option>
            </select>
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="cmyk-switch">{t("settings.cmyk")}</Label>
            <Switch id="cmyk-switch" checked={cmykEnabled} disabled />
          </div>

          <Button className="w-full mt-2 bg-gold-500 hover:bg-gold-600" onClick={handleExport} disabled={isExporting}>
            <Download className="mr-2 h-4 w-4" />
            {isExporting ? t("exporting") : `${exportFormat.toUpperCase()} ${t("action.export")}`}
          </Button>

          <div className="text-xs text-muted-foreground mt-2">
            <p>• {t("export.tips.cmyk")}</p>
            <p>• {t("export.tips.dpi")}</p>
            <p>• {t("export.tips.pdf")}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
