"use client"

import type React from "react"

import { useState, useRef, useEffect, useCallback, useMemo } from "react" // useMemo を追加
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload, Download, Printer, Trash2 } from "lucide-react"
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
  exportQuality: "standard" | "high" | "ultra" // Add exportQuality prop
}

export function IntegratedCardEditor({
  cardType,
  spacing,
  cmykConversion,
  cards,
