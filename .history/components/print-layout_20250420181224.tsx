"use client"

import { useRef, useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Printer, Download, Trash2 } from "lucide-react"
import { generatePDF, generatePNG } from "@/lib/pdf-generator"
import { toast } from "@/components/ui/use-toast"
import { useTranslation } from "@/lib/i18n"

interface PrintLayoutProps {
  cards: any[]
  spacing: number
  cardType: string
  cmykConversion: boolean
}

export function PrintLayout({ cards, spacing, cardType, cmykConversion }: PrintLayoutProps) {
  const { t } = useTranslation()
  const printRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [exportQuality, setExportQuality] = useState<"standard" | "high" | "ultra">("high")

  // Card dimensions in mm
  const cardDimensions = {
    pokemon: { width: 63, height: 88 },
    yugioh: { width: 59, height: 86 },
  }

  const { width, height } = cardDimensions[cardType as keyof typeof cardDimensions]

  // A4 size in mm: 210 x 297
  const a4Width = 210
  const a4Height = 297

  // Calculate how many cards can fit in a row and column with the given spacing
  const cardsPerRow = Math.floor((a4Width + spacing) / (width + spacing))
  const cardsPerColumn = Math.floor((a4Height + spacing) / (height + spacing))

  // Calculate the total width and height of the grid
  const gridWidth = cardsPerRow * width + (cardsPerRow - 1) * spacing
  const gridHeight = cardsPerColumn * height + (cardsPerColumn - 1) * spacing

  // Calculate the margins to center the grid on the A4 page
  const marginX = (a4Width - gridWidth) / 2
  const marginY = (a4Height - gridHeight) / 2

  // Convert mm to pixels for display (assuming 96 DPI for screen)
  const mmToPixels = (mm: number) => {
    // Fixed scale to ensure A4 fits in the container
    const containerWidth = 500 // Target container width in pixels
    const a4WidthInPixels = a4Width * (96 / 25.4)
    const scale = containerWidth / a4WidthInPixels
    return mm * (96 / 25.4) * scale
  }

  // Update canvas when cards or settings change
  useEffect(() => {
    renderCanvas()
  }, [cards, spacing, cardType, cmykConversion])

  const renderCanvas = () => {
    if (!canvasRef.current || !printRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d", { alpha: false })
    if (!ctx) return

    // Set canvas size to match A4 at 96 DPI (for screen display)
    // This will be scaled up for the actual export
    canvas.width = mmToPixels(a4Width)
    canvas.height = mmToPixels(a4Height)

    // Clear canvas
    ctx.fillStyle = "white"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Set image smoothing for better quality
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = "high"

    // Draw cards
    const loadImages = cards.map((card, index) => {
      if (!card) return Promise.resolve()

      const row = Math.floor(index / cardsPerRow)
      const col = index % cardsPerRow

      const x = mmToPixels(marginX + col * (width + spacing))
      const y = mmToPixels(marginY + row * (height + spacing))
      const cardWidth = mmToPixels(width)
      const cardHeight = mmToPixels(height)

      // Draw card background
      ctx.fillStyle = "#f0f0f0"
      ctx.fillRect(x, y, cardWidth, cardHeight)

      // Draw card image if available
      if (card.image) {
        return new Promise<void>((resolve) => {
          const img = new Image()
          img.crossOrigin = "anonymous"
          img.onload = () => {
            // Calculate position based on card dimensions and user-defined position
            // Use percentage-based positioning for more accurate placement
            const cardCenterX = x + cardWidth / 2
            const cardCenterY = y + cardHeight / 2

            // Apply the position offset (scaled by card dimensions)
            const offsetX = (cardWidth * card.position.x) / 100
            const offsetY = (cardHeight * card.position.y) / 100

            // Final position with offset
            const imgX = cardCenterX + offsetX
            const imgY = cardCenterY + offsetY

            // Draw the image with proper scaling
            ctx.save()
            ctx.translate(imgX, imgY)
            ctx.scale(card.scale, card.scale)
            ctx.translate(-img.width / 2, -img.height / 2)
            ctx.drawImage(img, 0, 0)
            ctx.restore()
            resolve()
          }
          img.onerror = () => {
            console.error("Failed to load image:", card.image)
            resolve()
          }
          img.src = card.image
        })
      }
      return Promise.resolve()
    })

    // Wait for all images to load
    Promise.all(loadImages).then(() => {
      // Canvas is now fully rendered
      console.log("Canvas rendering complete")
    })
  }

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

  const handleExportPDF = async () => {
    if (!canvasRef.current) return

    setIsExporting(true)
    try {
      // Show toast for high quality export
      if (exportQuality === "ultra") {
        // toast({
        //   title: "高品質出力処理中",
        //   description: "高解像度PDFの生成には時間がかかる場合があります。しばらくお待ちください。",
        })
      }

      // Generate PDF
      const options = {
        cards,
        spacing,
        cardType,
        cmykConversion,
        dpi: getDpiForQuality(),
        canvas: canvasRef.current,
        dimensions: {
          a4Width,
          a4Height,
          cardWidth: width,
          cardHeight: height,
          marginX,
          marginY,
          cardsPerRow,
          cardsPerColumn,
        },
      }

      const pdfBlob = await generatePDF(options)
      downloadFile(pdfBlob, "tcg-proxy-cards.pdf")
      // toast({
      //   title: t("toast.pdfSuccess"),
        description: t("toast.pdfSuccessDesc"),
      })
    } catch (error) {
      console.error("PDF export failed:", error)
      toast({
        title: t("toast.exportError"),
        description: `${t("toast.exportErrorDesc")}${error instanceof Error ? error.message : t("unknown error")}`,
        variant: "destructive",
      })
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportPNG = async () => {
    if (!canvasRef.current) return

    setIsExporting(true)
    try {
      // Show toast for high quality export
      if (exportQuality === "ultra") {
        toast({
          title: "高品質出力処理中",
          description: "高解像度PNGの生成には時間がかかる場合があります。しばらくお待ちください。",
        })
      }

      // Generate PNG
      const options = {
        cards,
        spacing,
        cardType,
        cmykConversion,
        dpi: getDpiForQuality(),
        canvas: canvasRef.current,
        dimensions: {
          a4Width,
          a4Height,
          cardWidth: width,
          cardHeight: height,
          marginX,
          marginY,
          cardsPerRow,
          cardsPerColumn,
        },
      }

      const pngBlob = await generatePNG(options)
      downloadFile(pngBlob, "tcg-proxy-cards.png")
      toast({
        title: t("toast.pngSuccess"),
        description: t("toast.pngSuccessDesc"),
      })
    } catch (error) {
      console.error("PNG export failed:", error)
      toast({
        title: t("toast.exportError"),
        description: `${t("toast.exportErrorDesc")}${error instanceof Error ? error.message : t("unknown error")}`,
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

  const handleRemoveCard = (index: number) => {
    // This would be implemented to remove a card from the layout
    const newCards = [...cards]
    newCards[index] = null
    // Update the parent component's state
    // This is just a placeholder - in a real implementation, we would call a function passed from the parent
    toast({
      title: t("toast.cardRemoved"),
      description: t("toast.cardRemovedDesc"),
    })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium">{t("layout.preview")}</h3>
          </div>

          <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-auto">
            <div
              ref={printRef}
              className="relative bg-white dark:bg-gray-900 border rounded-lg mx-auto"
              style={{
                width: `${mmToPixels(a4Width)}px`,
                height: `${mmToPixels(a4Height)}px`,
                boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
              }}
            >
              <canvas ref={canvasRef} id="print-layout-canvas" className="absolute top-0 left-0 w-full h-full" />

              {/* Visual overlay for card positions */}
              <div
                className="absolute top-0 left-0 pointer-events-none"
                style={{
                  padding: `${mmToPixels(marginY)}px ${mmToPixels(marginX)}px`,
                  width: "100%",
                  height: "100%",
                  boxSizing: "border-box",
                }}
              >
                <div
                  className="grid"
                  style={{
                    display: "grid",
                    gridTemplateColumns: `repeat(${cardsPerRow}, 1fr)`,
                    gap: `${mmToPixels(spacing)}px`,
                    width: "100%",
                    height: "100%",
                  }}
                >
                  {Array(cardsPerRow * cardsPerColumn)
                    .fill(0)
                    .map((_, index) => {
                      const card = cards[index]
                      return (
                        <div
                          key={index}
                          className={`relative border border-dashed border-gray-300 dark:border-gray-600 rounded cursor-pointer transition-all ${
                            selectedCardIndex === index ? "ring-2 ring-gold-500" : ""
                          }`}
                          style={{
                            width: `${mmToPixels(width)}px`,
                            height: `${mmToPixels(height)}px`,
                          }}
                          onClick={() => setSelectedCardIndex(index)}
                        >
                          {selectedCardIndex === index && card && (
                            <Button
                              variant="destructive"
                              size="icon"
                              className="absolute top-1 right-1 h-6 w-6 z-10"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleRemoveCard(index)
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      )
                    })}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">出力品質:</span>
                <select
                  className="text-sm border rounded p-1 bg-background"
                  value={exportQuality}
                  onChange={(e) => setExportQuality(e.target.value as any)}
                >
                  <option value="standard">標準 (300 DPI)</option>
                  <option value="high">高品質 (450 DPI)</option>
                  <option value="ultra">超高品質 (600 DPI)</option>
                </select>
              </div>

              <div className="flex space-x-2">
                <Button variant="outline" onClick={() => window.print()}>
                  <Printer className="mr-2 h-4 w-4" />
                  {t("action.print")}
                </Button>

                <Button variant="outline" onClick={handleExportPNG} disabled={isExporting}>
                  <Download className="mr-2 h-4 w-4" />
                  {t("layout.exportPNG")}
                </Button>

                <Button className="bg-gold-500 hover:bg-gold-600" onClick={handleExportPDF} disabled={isExporting}>
                  <Download className="mr-2 h-4 w-4" />
                  {t("layout.exportPDF")}
                </Button>
              </div>
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
        <p>
          • {t("layout.info.resolution")}: {getDpiForQuality()} DPI
        </p>
        <p className="mt-2 text-xs">• A4サイズ: 210mm × 297mm（実際の物理サイズで出力されます）</p>
      </div>
    </div>
  )
}
