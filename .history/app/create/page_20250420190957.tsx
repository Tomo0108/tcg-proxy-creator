
       <Card className="border-gold-500 mt-6"> {/* Added gold border and margin */}
                <CardContent className="p-6">
                  <h2 className="text-xl font-semibold mb-4">{t("export.title")}</h2>
                  <div className="space-y-4">
                    {/* Export Scope Toggle */}
                    <div>
                      <Label htmlFor="export-scope">{t("export.scope")}</Label>
                      <ToggleGroup
                        id="export-scope"
                        type="single"
                        value={exportScope}
                        onValueChange={(value) => { if (value) setExportScope(value as 'current' | 'all'); }}
                        className="mt-1 grid grid-cols-2 gap-2"
                        disabled={isExporting || isPrinting}
                      >
                        <ToggleGroupItem value="current" aria-label={t("export.scopeCurrent")}>
                          {t("export.scopeCurrent")}
                        </ToggleGroupItem>
                        <ToggleGroupItem value="all" aria-label={t("export.scopeAll")}>
                          {t("export.scopeAll")}
                        </ToggleGroupItem>
                      </ToggleGroup>
                    </div>

                    {/* Export Buttons */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <Button
                        onClick={handleExportPDF}
                        disabled={isExporting || isPrinting}
                        className="w-full border-gold-500" // Added gold border
                      >
                        <Download className="mr-2 h-4 w-4" /> PDF
                      </Button>
                      <Button
                        onClick={handleExportPNG}
                        disabled={isExporting || isPrinting || exportScope === 'all'} // Disable PNG for 'all' scope for now
                        className="w-full border-gold-500" // Added gold border
                      >
                        <Download className="mr-2 h-4 w-4" /> PNG
                      </Button>
                      <Button
                        onClick={handlePrint}
                        disabled={isExporting || isPrinting}
                        className="w-full border-gold-500" // Added gold border
                      >
                        <Printer className="mr-2 h-4 w-4" /> {t("action.print")}
                      </Button>
                    </div>
                    {(isExporting || isPrinting) && (
                      <p className="text-sm text-muted-foreground text-center animate-pulse">
                        {isPrinting ? t("status.printing") : t("status.exporting")}...
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
              {/* --- End Export/Print Controls --- */}

            </div>

            {/* Integrated Card Editor - Right Side */}
            <div className="lg:col-span-3">
            <IntegratedCardEditor
              cardType={cardType}
              spacing={spacing}
              cmykConversion={cmykConversion}
              // Pass the cards for the current page
              cards={pages[currentPageIndex] || []} // Ensure fallback to empty array
              onCardUpdate={handleCardUpdate}
              onCardRemove={handleCardRemove}
              // Pass the reset function for the current page
              onResetCards={handleResetCurrentPage} // Rename prop for clarity? Or keep as is? Let's keep for now.
              // Removed exportQuality, cmykMode, allPages, exportScope, setExportScope props
              // Pass page-related props
              currentPageIndex={currentPageIndex}
              pageCount={pages.length}
              setCurrentPageIndex={setCurrentPageIndex}
              addPage={addPage}
              deletePage={deletePage}
               // Pass all pages for potential multi-page export (if needed later) - Re-added for context, but IntegratedCardEditor won't use it directly for export buttons
               allPages={pages}
               />

            {/* --- Export/Print Controls (Moved Here) --- */}
            <Card className="border-gold-500 mt-6"> {/* Added gold border and margin */}
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold mb-4">{t("export.title")}</h2>
                <div className="space-y-4">
                  {/* Export Scope Toggle */}
                  <div>
                    <Label htmlFor="export-scope">{t("export.scope")}</Label>
                    <ToggleGroup
                      id="export-scope"
                      type="single"
                      value={exportScope}
                      onValueChange={(value) => { if (value) setExportScope(value as 'current' | 'all'); }}
                      className="mt-1 grid grid-cols-2 gap-2"
                      disabled={isExporting || isPrinting}
                    >
                      <ToggleGroupItem value="current" aria-label={t("export.scopeCurrent")}>
                        {t("export.scopeCurrent")}
                      </ToggleGroupItem>
                      <ToggleGroupItem value="all" aria-label={t("export.scopeAll")}>
                        {t("export.scopeAll")}
                      </ToggleGroupItem>
                    </ToggleGroup>
                  </div>

                  {/* Export Buttons */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Button
                      onClick={handleExportPDF}
                      disabled={isExporting || isPrinting}
                      className="w-full border-gold-500" // Added gold border
                    >
                      <Download className="mr-2 h-4 w-4" /> PDF
                    </Button>
                    <Button
                      onClick={handleExportPNG}
                      disabled={isExporting || isPrinting || exportScope === 'all'} // Disable PNG for 'all' scope for now
                      className="w-full border-gold-500" // Added gold border
                    >
                      <Download className="mr-2 h-4 w-4" /> PNG
                    </Button>
                    <Button
                      onClick={handlePrint}
                      disabled={isExporting || isPrinting}
                      className="w-full border-gold-500" // Added gold border
                    >
                      <Printer className="mr-2 h-4 w-4" /> {t("action.print")}
                    </Button>
                  </div>
                  {(isExporting || isPrinting) && (
                    <p className="text-sm text-muted-foreground text-center animate-pulse">
                      {isPrinting ? t("status.printing") : t("status.exporting")}...
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
            {/* --- End Export/Print Controls --- */}

          </div>
        </div>
      </div>
      <Toaster />
    </div>
  )
}
