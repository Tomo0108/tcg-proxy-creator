// Enhanced internationalization utility with more translations

import { create } from "zustand"

export type Locale = "en" | "ja"

type Translations = {
  [key: string]: {
    en: string
    ja: string
  }
}

const translations: Translations = {
  "app.title": {
    en: "TCG Proxy Creator",
    ja: "TCGプロキシクリエーター",
  },
  "app.description": {
    en: "Create high-quality proxy cards for trading card games",
    ja: "トレーディングカードゲーム用の高品質プロキシカードを作成",
  },
  "nav.create": {
    en: "Create",
    ja: "作成",
  },
  "nav.home": {
    en: "Home",
    ja: "ホーム",
  },
  "card.pokemon": {
    en: "Pokémon (63×88mm)",
    ja: "ポケモン (63×88mm)",
  },
  "card.yugioh": {
    en: "Yu-Gi-Oh! (59×86mm)",
    ja: "遊戯王 (59×86mm)",
  },
  "settings.cardType": {
    en: "Card Type",
    ja: "カードタイプ",
  },
  "settings.spacing": {
    en: "Card Spacing (mm)",
    ja: "カード間隔 (mm)",
  },
  "settings.cmyk": {
    en: "CMYK Color Conversion",
    ja: "CMYKカラー変換",
  },
  "settings.quality": { // Add quality translation
    en: "Quality",
    ja: "クオリティ",
  },
  "export.format": {
    en: "Export Format",
    ja: "出力形式",
  },
  "export.highRes": {
    en: "High Resolution (350 DPI)",
    ja: "高解像度 (350 DPI)",
  },
  "action.export": {
    en: "Export",
    ja: "エクスポート",
  },
  "action.print": {
    en: "Print",
    ja: "印刷",
  },
  "action.save": {
    en: "Save",
    ja: "保存",
  },
  "home.hero.title": {
    en: "Create High-Quality TCG Proxy Cards",
    ja: "高品質なTCGプロキシカードを作成",
  },
  "home.hero.description": {
    en: "Design, arrange, and print professional-grade proxy cards for Pokémon, Yu-Gi-Oh! and more.",
    ja: "ポケモン、遊戯王などプロキシカードを印刷するデータを作成します。",
  },
  "home.getStarted": {
    en: "Get Started",
    ja: "はじめる",
  },
  "home.feature1.title": {
    en: "High-Resolution Cards",
    ja: "高解像度カード",
  },
  "home.feature1.description": {
    en: "Create and save cards at 350 DPI with CMYK color conversion for optimal print quality.",
    ja: "最適な印刷品質のために、CMYKカラー変換を使用して350 DPIでカードを作成・保存します。",
  },
  "home.feature2.title": {
    en: "A4 Print Layout",
    ja: "A4印刷レイアウト",
  },
  "home.feature2.description": {
    en: "Arrange up to nine cards on an A4 sheet with adjustable spacing for perfect printing.",
    ja: "A4シートに最大9枚のカードを配置し、完璧な印刷のために間隔を調整できます。",
  },
  "home.feature3.title": {
    en: "Multiple Export Options",
    ja: "複数の出力オプション",
  },
  "home.feature3.description": {
    en: "Save your designs in PNG or PDF format with professional print-ready settings.",
    ja: "プロフェッショナルな印刷準備設定でPNGまたはPDF形式でデザインを保存できます。",
  },
  "footer.copyright": {
    en: "© 2025 TCG Proxy Creator. All rights reserved.",
    ja: "© 2025 TCGプロキシクリエーター. All rights reserved.",
  },
  "footer.terms": {
    en: "Terms",
    ja: "利用規約",
  },
  "footer.privacy": {
    en: "Privacy",
    ja: "プライバシーポリシー",
  },
  "create.title": {
    en: "Create Proxy Cards",
    ja: "プロキシカード作成",
  },
  "create.settings.title": {
    en: "Card Settings",
    ja: "カード設定",
  },
  "create.export.title": {
    en: "Export Options",
    ja: "エクスポート設定",
  },
  "create.tabs.editor": {
    en: "Card Editor",
    ja: "カードエディタ",
  },
  "create.tabs.layout": {
    en: "Print Layout",
    ja: "プリントレイアウト",
  },
  "editor.uploadImage": {
    en: "Upload Image",
    ja: "画像をアップロード",
  },
  "editor.clickToUpload": {
    en: "Click to upload or drag and drop",
    ja: "クリックしてアップロードまたはドラッグ＆ドロップ",
  },
  "editor.fileTypes": {
    en: "PNG, JPG, GIF up to 10MB",
    ja: "PNG、JPG、GIF（最大10MB）",
  },
  "editor.cardPreview": {
    en: "Card Preview",
    ja: "カードプレビュー",
  },
  "editor.imageScale": {
    en: "Image Scale",
    ja: "画像スケール",
  },
  "editor.positionX": {
    en: "Position X",
    ja: "X位置",
  },
  "editor.positionY": {
    en: "Position Y",
    ja: "Y位置",
  },
  "editor.saveToCard": {
    en: "Save to Card",
    ja: "カードに保存",
  },
  "editor.noImage": {
    en: "No image uploaded",
    ja: "画像がアップロードされていません",
  },
  "layout.preview": {
    en: "A4 Print Layout Preview",
    ja: "A4プリントレイアウトプレビュー",
  },
  "layout.emptyCard": {
    en: "Empty Card",
    ja: "空のカード",
  },
  "layout.exportPNG": {
    en: "Export PNG",
    ja: "PNG出力",
  },
  "layout.exportPDF": {
    en: "Export PDF",
    ja: "PDF出力",
  },
  "layout.info.cardType": {
    en: "Card Type",
    ja: "カードタイプ",
  },
  "layout.info.spacing": {
    en: "Card Spacing",
    ja: "カード間隔",
  },
  "layout.info.cmyk": {
    en: "CMYK Conversion",
    ja: "CMYK変換",
  },
  "layout.info.resolution": {
    en: "Resolution",
    ja: "解像度",
  },
  "export.tips.cmyk": {
    en: "CMYK conversion ensures optimal print quality",
    ja: "CMYK変換は印刷品質を最適化します",
  },
  "export.tips.dpi": {
    en: "350 DPI is recommended for professional printing",
    ja: "プロフェッショナルな印刷には350 DPIをお勧めします",
  },
  "export.tips.pdf": {
    en: "PDF format preserves vector quality for printing",
    ja: "PDF形式は印刷用のベクター品質を保持します",
  },
  "toast.pdfSuccess": {
    en: "PDF Export Complete",
    ja: "PDF エクスポート完了",
  },
  "toast.pdfSuccessDesc": {
    en: "PDF file has been successfully generated.",
    ja: "PDFファイルが正常に生成されました。",
  },
  "toast.pngSuccess": {
    en: "PNG Export Complete",
    ja: "PNG エクスポート完了",
  },
  "toast.pngSuccessDesc": {
    en: "High-resolution PNG file has been successfully generated.",
    ja: "高解像度PNGファイルが正常に生成されました。",
  },
  "toast.exportError": {
    en: "Export Error",
    ja: "エクスポートエラー",
  },
  "toast.exportErrorDesc": {
    en: "Failed to export: ",
    ja: "エクスポートに失敗しました: ",
  },
  "toast.cardRemoved": {
    en: "Card Removed",
    ja: "カード削除",
  },
  "toast.cardRemovedDesc": {
    en: "Card has been removed.",
    ja: "カードが削除されました。",
  },
  "toast.cardSaved": {
    en: "Card Saved",
    ja: "カード保存",
  },
  "toast.cardSavedDesc": {
    en: "Card has been saved to position",
    ja: "カードが保存されました：位置",
  },
  enabled: {
    en: "Enabled",
    ja: "有効",
  },
  disabled: {
    en: "Disabled",
    ja: "無効",
  },
  exporting: {
    en: "Exporting...",
    ja: "エクスポート中...",
  },
  "action.resetAll": { // Add reset button translation
    en: "Reset All",
    ja: "リセット",
  },
  "action.clickOrDropToUpload": { // New key for upload area
    en: "Click or drag & drop to upload image",
    ja: "クリックまたはドラッグ＆ドロップで画像をアップロード",
  },
  "quality.standard": {
    en: "Standard",
    ja: "標準",
  },
  "quality.high": {
    en: "High",
    ja: "高",
  },
  "quality.ultra": {
    en: "Ultra",
     ja: "最高",
   },
   "settings.cmykMode": { // New key for CMYK mode
     en: "CMYK Conversion Mode",
     ja: "CMYK変換モード",
   },
   "cmykMode.simple": { // New key for simple mode
     en: "Simple (Simulation)",
     ja: "シンプル (シミュレーション)",
   },
   "cmykMode.accurate": { // New key for accurate mode
     en: "Accurate (Experimental)",
     ja: "高精度 (実験的)",
   },
   // Remove unused keys: action.uploadImage, action.uploadToSelected
 }

// Create a store for language state
interface LanguageState {
  locale: Locale
  setLocale: (locale: Locale) => void
}

export const useLanguageStore = create<LanguageState>((set) => ({
  locale: "en",
  setLocale: (locale) => set({ locale }),
}))

export function useTranslation() {
  const { locale, setLocale } = useLanguageStore()

  const t = (key: string): string => {
    if (translations[key]) {
      return translations[key][locale]
    }
    console.warn(`Translation missing for key: ${key}`)
    return key
  }

  return { t, locale, setLocale }
}
