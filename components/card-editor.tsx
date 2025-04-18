"use client"
import type React from "react"
import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload, Move } from "lucide-react"
import { useTranslation } from "@/lib/i18n"

interface CardEditorProps {
  cardType: string
  onCardCreated: (card: any, index: number) => void
}

export function CardEditor({ cardType, onCardCreated }: CardEditorProps) {
  const { t } = useTranslation()
  const [selectedCardIndex, setSelectedCardIndex] = useState(0)
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 })
  const [imageScale, setImageScale] = useState(1)
  const [originalImageSize, setOriginalImageSize] = useState({ width: 0, height: 0 })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const previewContainerRef = useRef<HTMLDivElement>(null)

  const cardDimensions = {
    pokemon: { width: 63, height: 88 },
    yugioh: { width: 59, height: 86 },
  }

  const { width, height } = cardDimensions[cardType as keyof typeof cardDimensions]

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      processImage(file)
    }
  }

  // Replace the processImage function with this improved version:
  const processImage = (file: File) => {
    const reader = new FileReader()
    reader.onload = (event) => {
      const img = new Image()
      img.onload = () => {
        // Store original image dimensions
        setOriginalImageSize({ width: img.width, height: img.height })

        // Set the image URL directly without resizing
        setUploadedImage(img.src)

        // Reset position to center
        setImagePosition({ x: 0, y: 0 })

        // Calculate scale to fit the card width exactly
        const previewWidth = width * 4
        const initialScale = previewWidth / img.width

        setImageScale(initialScale)
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

  const handleSaveCard = () => {
    if (uploadedImage) {
      onCardCreated(
        {
          image: uploadedImage,
          position: imagePosition,
          scale: imageScale,
          type: cardType,
          originalSize: originalImageSize, // Store original size for better scaling during export
        },
        selectedCardIndex,
      )
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

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4 mb-6">
        {Array(9)
          .fill(0)
          .map((_, index) => (
            <Button
              key={index}
              variant={selectedCardIndex === index ? "default" : "outline"}
              className={`h-16 flex items-center justify-center ${
                selectedCardIndex === index ? "bg-gold-500 hover:bg-gold-600" : ""
              }`}
              onClick={() => setSelectedCardIndex(index)}
            >
              {t("editor.saveToCard")} {index + 1}
            </Button>
          ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-medium mb-4">{t("editor.uploadImage")}</h3>
            <div className="space-y-4">
              <div
                className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                <Upload className="h-10 w-10 text-gray-400 mb-2" />
                <p className="text-sm text-gray-500">{t("editor.clickToUpload")}</p>
                <p className="text-xs text-gray-400 mt-1">{t("editor.fileTypes")}</p>
                <Input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
              </div>

              {uploadedImage && (
                <div className="relative border rounded-lg overflow-hidden h-40">
                  <img
                    ref={imageRef}
                    src={uploadedImage || "/placeholder.svg"}
                    alt="Uploaded card image"
                    className="w-full h-full object-contain"
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-medium mb-4">{t("editor.cardPreview")}</h3>
            <div
              ref={previewContainerRef}
              className="border rounded-lg overflow-hidden bg-white dark:bg-gray-800"
              style={{
                width: `${width * 4}px`,
                height: `${height * 4}px`,
                margin: "0 auto",
                position: "relative",
              }}
            >
              {uploadedImage && (
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
              )}

              <div className="absolute bottom-2 right-2 bg-white/80 dark:bg-gray-700/80 rounded-full p-1">
                <Move className="h-5 w-5 text-gray-500" />
              </div>
            </div>

            <div className="mt-4 space-y-4">
              {/* Replace the Image Scale control section: */}
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
                    className="w-24"
                  />
                  <span className="text-sm text-gray-500">x</span>
                </div>
              </div>

              {/* Remove this entire section: */}

              <Button className="w-full bg-gold-500 hover:bg-gold-600" onClick={handleSaveCard}>
                {t("editor.saveToCard")} {selectedCardIndex + 1}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
