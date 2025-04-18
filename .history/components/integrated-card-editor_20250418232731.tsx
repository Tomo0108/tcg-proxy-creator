
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
