
      const row = Math.floor(index / cardsPerRow)
      const col = index % cardsPerRow

      // Calculate dimensions in pixels for the preview canvas
      const x = mmToPixels(marginX + col * (width + spacing))
      const y = mmToPixels(marginY + row * (height + spacing))
      const cardWidthPx = mmToPixels(width) // Define cardWidthPx here
      const cardHeightPx = mmToPixels(height) // Define cardHeightPx here

      // Draw card background
      ctx.fillStyle = "#f0f0f0"
      ctx.fillRect(x, y, cardWidthPx, cardHeightPx) // Use cardWidthPx and cardHeightPx

      // Draw card image if available
      if (card.image) {
        return new Promise<void>((resolve) => {
          const img = new Image()
          img.crossOrigin = "anonymous"
          img.onload = () => {
            // Use captured variables to calculate card position and size inside the callback
            const drawX = currentDrawOffsetX + (currentMarginX + col * (currentWidth + currentSpacing)) * currentScaleFactor;
            const drawY = currentDrawOffsetY + (currentMarginY + row * (currentHeight + currentSpacing)) * currentScaleFactor;
            const drawCardWidth = currentWidth * currentScaleFactor;
            const drawCardHeight = currentHeight * currentScaleFactor;

            ctx.save();
            // --- Start Clipping ---
            ctx.beginPath();
            ctx.rect(drawX, drawY, drawCardWidth, drawCardHeight); // Use recalculated values
            ctx.clip();
            // --- End Clipping ---

            // Calculate image draw size to fit within the card, maintaining aspect ratio and applying user scale
            const imgAspectRatio = img.width / img.height;
            const cardAspectRatio = drawCardWidth / drawCardHeight; // Use recalculated values

            let targetWidth, targetHeight;
            if (imgAspectRatio > cardAspectRatio) { // Image is wider than card area needs
                targetWidth = drawCardWidth * currentCardScale; // Use captured card scale
                targetHeight = targetWidth / imgAspectRatio;
            } else { // Image is taller than card area needs
                targetHeight = drawCardHeight * currentCardScale; // Use captured card scale
                targetWidth = targetHeight * imgAspectRatio;
            }

            // Calculate position to center the scaled image within the card area
            const imgDrawX = drawX + (drawCardWidth - targetWidth) / 2; // Use recalculated values
            const imgDrawY = drawY + (drawCardHeight - targetHeight) / 2; // Use recalculated values

            // Draw the image
            ctx.drawImage(img, imgDrawX, imgDrawY, targetWidth, targetHeight);

            ctx.restore(); // Remove clipping and restore context state
            resolve();
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
                    top: `50%`, // Always center vertically
                    left: `50%`, // Always center horizontally
                    transform: `translate(-50%, -50%) scale(${imageScale})`,
                    width: "100%", // Ensure div takes full space for centering
                    height: "100%", // Ensure div takes full space for centering
                    display: "flex", // Use flexbox for centering image inside
                    alignItems: "center", // Center vertically
                    justifyContent: "center", // Center horizontally
                    // cursor: "move", // Removed cursor style
                  }}
                  // onMouseDown={handleImageMouseDown} // Removed mouse down handler
                >
                  <img
                    src={uploadedImage || "/placeholder.svg"}
                    alt="Card preview"
                    style={{
                      maxWidth: "100%", // Let transform scale handle size
                      maxHeight: "100%", // Let transform scale handle size
                      objectFit: "contain", // Ensure aspect ratio is maintained
                    }}
                    draggable={false}
                  />
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <p className="text-sm">{t("editor.noImage")}</p>
                </div>
              )}

              {/* Removed Move icon */}
              {/* <div className="absolute bottom-2 right-2 bg-white/80 dark:bg-gray-700/80 rounded-full p-1">
                <Move className="h-4 w-4 text-gray-500" />
              </div> */}
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

                {/* Visual overlay grid */}
                <div
                  className="absolute top-0 left-0 w-full h-full z-10" // Ensure it covers the canvas and add z-index
                  style={{
                    paddingLeft: `${mmToPixels(marginX)}px`,
                    paddingTop: `${mmToPixels(marginY)}px`,
                    pointerEvents: "none", // Disable pointer events on the overlay container itself
                  }}
                >
                  <div
                    className="grid h-full" // Use grid layout
                    style={{
                      gridTemplateColumns: `repeat(${cardsPerRow}, ${mmToPixels(width)}px)`,
                      gridTemplateRows: `repeat(${cardsPerColumn}, ${mmToPixels(height)}px)`,
                      gap: `${mmToPixels(spacing)}px`,
                      width: `${mmToPixels(gridWidth)}px`, // Explicit width for the grid area
                      height: `${mmToPixels(gridHeight)}px`, // Explicit height for the grid area
                    }}
                  >
                    {/* Clickable Card placeholders */}
                    {Array(cardsPerRow * cardsPerColumn)
                      .fill(0)
                      .map((_, index) => (
                        <div
                          key={index}
                          className={`relative border border-dashed border-gray-500 dark:border-gray-600 rounded cursor-pointer transition-all hover:bg-gray-100/50 dark:hover:bg-gray-800/50 ${ // Added relative, changed border color, hover effect
                            selectedCardIndex === index ? "ring-2 ring-gold-500 ring-offset-1" : "" // Added ring-offset
                          }`}
                          style={{ pointerEvents: "auto" }} // Enable pointer events for individual cells
                          onClick={() => setSelectedCardIndex(index)}
                        >
                          {/* Remove button inside grid cell */}
                          {cards[index] && ( // Show trash icon if card exists at this index
                            <Button
                              variant="destructive"
                              size="icon"
                              className="absolute top-1 right-1 h-5 w-5 z-20" // Increased z-index for button
                              onClick={(e) => {
                                e.stopPropagation() // Prevent grid cell click
                                onCardRemove(index)
                              }}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Export Controls */}
            <div className="mt-6 space-y-4">
              {/* DPI Selection Added Here at the top of Export Controls */}
              <div>
                <Label htmlFor="export-quality">{t("layout.exportQuality")}</Label>
                <select
                  id="export-quality"
                  className="text-sm border rounded p-1 bg-background w-full mt-2"
                  value={exportQuality}
                  title={t("layout.exportQuality")}
                  onChange={(e) => setExportQuality(e.target.value as any)}
                >
                  <option value="standard">標準 (300 DPI)</option>
                  <option value="high">高品質 (450 DPI)</option>
                  <option value="ultra">超高品質 (600 DPI)</option>
                </select>
              </div>

              {/* Buttons remain below */}
              <div className="flex flex-col sm:flex-row justify-end items-center gap-4"> {/* Keep justify-end */}
                 {/* Ensure no DPI selection element is here */}
                <div className="flex space-x-2 justify-end w-full sm:w-auto"> {/* Ensure buttons are always in a row */}
                  <Button variant="outline" onClick={() => window.print()} className="flex-1 sm:flex-none sm:w-28"> {/* Equal width on small, fixed on larger */}
                    <Printer className="mr-2 h-4 w-4" />
                    {t("action.print")}
                  </Button>

                  <Button variant="outline" onClick={handleExportPNG} disabled={isExporting} className="flex-1 sm:flex-none sm:w-28"> {/* Equal width on small, fixed on larger */}
                    <Download className="mr-2 h-4 w-4" />
                    PNG
                  </Button>

                  <Button className="bg-gold-500 hover:bg-gold-600 flex-1 sm:flex-none sm:w-28" onClick={handleExportPDF} disabled={isExporting}> {/* Equal width on small, fixed on larger */}
                    <Download className="mr-2 h-4 w-4" />
                    PDF
                  </Button>
                </div>
              </div>
            </div>
            {/* Removed extra closing div */}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
