"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Header } from "@/components/header"
import { Toaster } from "@/components/toaster"
import { useTranslation } from "@/lib/i18n"
import { IntegratedCardEditor } from "@/components/integrated-card-editor"
import { useMobileDetect } from "@/hooks/use-mobile"

export default function CreatePage() {
  const { t } = useTranslation()
  const [cardType, setCardType] = useState("pokemon")
  const [spacing, setSpacing] = useState(5)
  const [cmykConversion, setCmykConversion] = useState(true)
  const [cards, setCards] = useState(Array(9).fill(null))
  const [exportQuality, setExportQuality] = useState<"standard" | "high" | "ultra">("high") // Add exportQuality state
  const isMobile = useMobileDetect()

  // Handle card creation or update
  const handleCardUpdate = (card: any, index: number) => {
    const newCards = [...cards]
    newCards[index] = card
    setCards(newCards)
  }

  // Handle card removal
  const handleCardRemove = (index: number) => {
    const newCards = [...cards]
    newCards[index] = null
    setCards(newCards)
  }

  return (
