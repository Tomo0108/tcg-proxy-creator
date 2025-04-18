
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
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4"> {/* Keep items-center */}
                <div className="flex items-center"> {/* Removed space-x-2 */}
                  {/* Output quality label removed */}
                  <select
                    className="text-sm border rounded p-1 bg-background"
                    value={exportQuality}
                    title={t("layout.exportQuality")} // Add title for accessibility
                    onChange={(e) => setExportQuality(e.target.value as any)}
                  >
                    <option value="standard">標準 (300 DPI)</option>
                    <option value="high">高品質 (450 DPI)</option>
                    <option value="ultra">超高品質 (600 DPI)</option>
                  </select>
                </div>

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
