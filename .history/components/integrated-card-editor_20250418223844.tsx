"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload, Move, Download, Printer, Trash2 } from "lucide-react"
import { useTranslation } from "@/lib/i18n"
import { generatePDF, generatePNG } from "@/lib/pdf-generator"
import { toast } from "@/components/ui/use-toast"
import { useMobileDetect } from "@/hooks/use-mobile"

interface IntegratedCardEditorProps {
  cardType: string
  spacing: number
  cmykConversion: boolean
  cards: any[]
  onCardUpdate: (card: any, index: number) => void
  onCardRemove: (index: number) => void
}

export function IntegratedCardEditor({
  cardType,
  spacing,
  cmykConversion,
  cards,
  onCardUpdate,
  onCardRemove,
}: IntegratedCardEditorProps) {
  const { t } = useTranslation()
  const isMobile = useMobileDetect()
  const [selectedCardIndex, setSelectedCardIndex] = useState(0)
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 })
  const [imageScale, setImageScale] = useState(1)
  const [originalImageSize, setOriginalImageSize] = useState({ width: 0, height: 0 })
  const [exportQuality, setExportQuality] = useState<"standard" | "high" | "ultra">("high")
  const [isExporting, setIsExporting] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const previewContainerRef = useRef<HTMLDivElement>(null)
  const printRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

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

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      processImage(file)
    }
  }

  // Process image with smart resizing
  const processImage = (file: File) => {
    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        // Store original image dimensions
        setOriginalImageSize({ width: img.width, height: img.height })

        // Set the image URL directly
        setUploadedImage(img.src)

        // Reset position to center
        setImagePosition({ x: 0, y: 0 })

        // Calculate scale to fit the preview container
        if (previewContainerRef.current) {
          const containerWidth = previewContainerRef.current.clientWidth
          const containerHeight = previewContainerRef.current.clientHeight
          const imageAspectRatio = img.width / img.height
          const containerAspectRatio = containerWidth / containerHeight

          let initialScale
          if (imageAspectRatio > containerAspectRatio) {
            // Fit to width
            initialScale = containerWidth / img.width
          } else {
            // Fit to height
            initialScale = containerHeight / img.height
          }
          setImageScale(initialScale)
        } else {
          // Fallback if container ref is not available yet
          const previewWidth = width * 4 // Use card width as fallback basis
          const initialScale = previewWidth / img.width
          setImageScale(initialScale)
        }
      }
      img.src = event.target?.result as string
    }
    reader.readAsDataURL(file)
  }

  // Handle drag and drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const files = e.dataTransfer.files
    if (files.length > 0) {
      processImage(files[0])
    }
  }

  // Save current card
  const handleSaveCard = () => {
    if (uploadedImage) {
      onCardUpdate(
        {
          image: uploadedImage,
          position: imagePosition,
          scale: imageScale,
          type: cardType,
          originalSize: originalImageSize,
        },
        selectedCardIndex,
      )

      // Show success toast
      toast({
        title: t("toast.cardSaved"),
        description: `${t("toast.cardSavedDesc")} ${selectedCardIndex + 1}`,
      })
    }
  }

  // Image dragging functionality
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })

  const handleImageMouseDown = (e: React.MouseEvent) => {
    if (previewContainerRef.current) {
      setIsDragging(true)
      setDragStart({
        x: e.clientX - imagePosition.x,
        y: e.clientY - imagePosition.y,
      })
    }
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging && previewContainerRef.current) {
      const rect = previewContainerRef.current.getBoundingClientRect()
      const centerX = rect.width / 2
      const centerY = rect.height / 2

      // Calculate new position relative to center
      const newX = e.clientX - dragStart.x
      const newY = e.clientY - dragStart.y

      // Limit movement to prevent image from going too far off-screen
      const maxOffset = 50 // Maximum percentage offset from center
      const clampedX = Math.max(-maxOffset, Math.min(maxOffset, newX))
      const clampedY = Math.max(-maxOffset, Math.min(maxOffset, newY))

      setImagePosition({ x: clampedX, y: clampedY })
    }
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  // Update canvas when cards or settings change
  useEffect(() => {
    renderCanvas()
  }, [cards, spacing, cardType, cmykConversion])

  // Set up mouse event listeners for dragging
  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove)
      window.addEventListener("mouseup", handleMouseUp)
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }, [isDragging, dragStart])

  // Load selected card data when changing card index
  useEffect(() => {
    const selectedCard = cards[selectedCardIndex]
    if (selectedCard) {
      setUploadedImage(selectedCard.image)
      setImagePosition(selectedCard.position)
      setImageScale(selectedCard.scale)
      if (selectedCard.originalSize) {
        setOriginalImageSize(selectedCard.originalSize)
      }
    } else {
      setUploadedImage(null)
      setImagePosition({ x: 0, y: 0 })
      setImageScale(1)
      setOriginalImageSize({ width: 0, height: 0 })
    }
  }, [selectedCardIndex, cards])

  // Canvas rendering function
  const renderCanvas = () => {
    if (!canvasRef.current || !printRef.current) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d", { alpha: false })
    if (!ctx) return

    // Set canvas size to match A4 at 96 DPI (for screen display)
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

  // Export functions
  const handleExportPDF = async () => {
    if (!canvasRef.current) return

    setIsExporting(true)
    try {
      // Show toast for high quality export
      if (exportQuality === "ultra") {
        toast({
          title: "高品質出力処理中",
          description: "高解像度PDFの生成には時間がかかる場合があります。しばらくお待ちください。",
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
      toast({
        title: t("toast.pdfSuccess"),
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

  return (
    <div className="space-y-6">
      {/* Card Selection Grid */}
      <div className="grid grid-cols-3 md:grid-cols-9 gap-2 mb-4">
        {Array(9)
          .fill(0)
          .map((_, index) => (
            <Button
              key={index}
              variant={selectedCardIndex === index ? "default" : "outline"}
              className={`h-12 flex items-center justify-center ${
                selectedCardIndex === index ? "bg-gold-500 hover:bg-gold-600" : ""
              } ${cards[index] ? "border-gold-300" : ""}`}
              onClick={() => setSelectedCardIndex(index)}
            >
              {index + 1}
              {cards[index] && <div className="w-2 h-2 bg-gold-500 rounded-full absolute top-1 right-1"></div>}
            </Button>
          ))}
      </div>

      {/* Main Content Area - Side by Side on Desktop, Stacked on Mobile */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card Editor */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-medium mb-4">{t("editor.cardPreview")}</h3>

            {/* Image Upload Area */}
            <div
              className="border-2 border-dashed rounded-lg p-4 mb-4 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              <Upload className="h-6 w-6 text-gray-400 mb-1" />
              <p className="text-sm text-gray-500">{t("editor.clickToUpload")}</p>
              <p className="text-xs text-gray-400">{t("editor.fileTypes")}</p>
              <Input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
            </div>

            {/* Card Preview */}
            <div
              ref={previewContainerRef}
              className="border rounded-lg overflow-hidden bg-white dark:bg-gray-800 mb-4"
              style={{
                width: `${width * 4}px`,
                height: `${height * 4}px`,
                margin: "0 auto",
                position: "relative",
              }}
            >
              {uploadedImage ? (
                <div
                  style={{
                    position: "absolute",
                    top: `${50 + imagePosition.y}%`,
                    left: `${50 + imagePosition.x}%`,
                    transform: `translate(-50%, -50%) scale(${imageScale})`,
                    maxWidth: "100%",
                    maxHeight: "100%",
                    cursor: "move",
                  }}
                  onMouseDown={handleImageMouseDown}
                >
                  <img
                    src={uploadedImage || "/placeholder.svg"}
                    alt="Card preview"
                    style={{
                      maxWidth: "100%",
                      maxHeight: "100%",
                      objectFit: "contain",
                    }}
                    draggable={false}
                  />
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <p className="text-sm">{t("editor.noImage")}</p>
                </div>
              )}

              <div className="absolute bottom-2 right-2 bg-white/80 dark:bg-gray-700/80 rounded-full p-1">
                <Move className="h-4 w-4 text-gray-500" />
              </div>
            </div>

            {/* Image Controls */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="image-scale">{t("editor.imageScale")}</Label>
                <div className="flex items-center gap-2 mt-2">
                  <Input
                    id="image-scale"
                    type="number"
                    min="0.01"
                    max="5"
                    step="0.01"
                    value={imageScale.toFixed(2)}
                    onChange={(e) => setImageScale(Number(e.target.value))}
                    disabled={!uploadedImage}
                    className="w-24"
                  />
                  <span className="text-sm text-gray-500">x</span>
                </div>
              </div>

              <div className="flex space-x-2">
                <Button
                  className="flex-1 bg-gold-500 hover:bg-gold-600"
                  onClick={handleSaveCard}
                  disabled={!uploadedImage}
                >
                  {t("editor.saveToCard")} {selectedCardIndex + 1}
                </Button>

                {cards[selectedCardIndex] && (
                  <Button variant="outline" className="w-10 flex-none" onClick={() => onCardRemove(selectedCardIndex)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Print Layout Preview */}
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">{t("layout.preview")}</h3>
            </div>

            <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded-lg overflow-auto">
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
                                className="absolute top-1 right-1 h-5 w-5 z-10"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  onCardRemove(index)
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

            {/* Export Controls */}
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
                    PNG
                  </Button>

                  <Button className="bg-gold-500 hover:bg-gold-600" onClick={handleExportPDF} disabled={isExporting}>
                    <Download className="mr-2 h-4 w-4" />
                    PDF
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
