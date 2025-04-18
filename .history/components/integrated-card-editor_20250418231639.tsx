
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

            {/* Container ensures aspect ratio and prevents overflow */}
            <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded-lg overflow-hidden">
              <div
                ref={printRef}
                className="relative bg-white dark:bg-gray-900 border rounded-lg mx-auto"
                style={{
                  width: "100%", // Fit parent width
                  aspectRatio: `${a4Width} / ${a4Height}`, // Maintain A4 aspect ratio
                  boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                  overflow: "hidden", // Hide potential canvas overflow during resize
                }}
              >
                {/* Canvas will be sized by renderCanvas based on this container */}
                <canvas ref={canvasRef} id="print-layout-canvas" className="absolute top-0 left-0 w-full h-full" />

                {/* Visual overlay needs dynamic scaling based on actual container size */}
                <div
                  className="absolute top-0 left-0 pointer-events-none"
                  // Style calculation moved to useEffect/renderCanvas for accuracy
                >
                  {/* Grid overlay content remains, but styling is now dynamic */}
                  <div
                    className="grid absolute inset-0" // Use absolute positioning to overlay canvas
                    // Dynamic styles will be applied in useEffect/renderCanvas
                  >
                    {/* Card placeholders - visual only */}
                    {Array(cardsPerRow * cardsPerColumn)
                      .fill(0)
                      .map((_, index) => (
                        <div
                          key={index}
                          className={`border border-dashed border-gray-300 dark:border-gray-600 rounded cursor-pointer transition-all ${
                            selectedCardIndex === index ? "ring-2 ring-gold-500" : ""
                          }`}
                          // Dynamic size/position applied in useEffect/renderCanvas
                          onClick={() => setSelectedCardIndex(index)}
                        >
                          {/* Remove button logic remains */}
                          {selectedCardIndex === index && cards[index] && ( // Use cards[index] here
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
                        </div> // Add missing closing div tag
                      ))}
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
