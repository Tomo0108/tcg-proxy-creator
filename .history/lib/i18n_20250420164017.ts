// Enhanced internationalization utility with more translations

import { create } from "zustand"

export type Locale = "en" | "ja"

type Translations = {
  [key: string]: {
    en: string
    ja: string
  }
}

// Combine existing and new translations based on the provided file content
const translations: Translations = {
  "app.title": {
    en: "TCG Proxy Creator",
    ja: "TCG Proxy Creator",
  },
  "app.description": {
    en: "Create high-quality proxy cards for trading card games",
    ja: "トレーディングカードゲーム用の高品質なプロキシカードを作成",
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
  "settings.quality": {
    en: "Quality",
    ja: "クオリティ",
  },
  "export.format": {
    en: "Export Format",
    ja: "出力形式",
  },
  "export.highRes": {
    en: "High Resolution (350 DPI)", // Note: DPI is now dynamic, this might need adjustment later
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
    en: "TCG Proxy Creator",
    ja: "TCG Proxy Creator",
  },
  "home.hero.description": {
    en: "Create high quality data for printing TCG proxy cards",
    ja: "TCGのプロキシカードを印刷するための高品質なデータを作成",
  },
  "home.getStarted": {
    en: "START",
    ja: "はじめる",
  },
  "home.feature1.title": {
    en: "High resolution up to 600 DPI",
    ja: "最大600DPIの高解像度",
  },
  "home.feature1.description": {
    en: "Create and save cards in ultra-high resolution for beautiful print quality.",
    ja: "美しい印刷品質を得るために、超高解像度でカードを作成・保存します。",
  },
  "home.feature2.title": {
    en: "A4 Print Layout",
    ja: "A4印刷レイアウト",
  },
  "home.feature2.description": {
    en: "Up to 9 cards can be placed on an A4 sheet and the layout of printing can be adjusted.",
    ja: "A4シートに最大9枚のカードを配置し、印刷のレイアウトを調整できます。",
  },
  "home.feature3.title": {
    en: "Multiple Export Options",
    ja: "複数の出力オプション",
  },
  "home.feature3.description": {
    en: "Save your design in PNG or PDF format with a simple operation.",
    ja: "簡単な操作でPNGまたはPDF形式でデザインを保存できます。",
  },
  "footer.copyright": {
    en: "© 2025 TCG Proxy Creator. All rights reserved.",
    ja: "© 2025 TCG Proxy Creator. All rights reserved.",
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
    ja: "プロキシカードの作成",
  },
  "create.settings.title": {
    en: "Settings",
    ja: "設定",
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
  "editor.saveToCard": {
    en: "Save to Card",
    ja: "カードに保存",
  },
  "editor.noImage": {
    en: "No image uploaded",
    ja: "画像がアップロードされていません",
  },
  "layout.preview": {
    en: "Preview",
    ja: "プレビュー",
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
   "toast.pageReset": {
     en: "Page Reset",
     ja: "ページリセット",
   },
   "toast.pageResetDesc": {
     en: "Page {page} has been reset.",
     ja: "ページ {page} がリセットされました。",
   },
   "toast.pageAdded": {
     en: "Page Added",
     ja: "ページ追加",
   },
   "toast.pageAddedDesc": {
     en: "New page {page} has been added.",
     ja: "新しいページ {page} が追加されました。",
   },
   "toast.pageDeleted": {
     en: "Page Deleted",
     ja: "ページ削除",
   },
   "toast.pageDeletedDesc": {
     en: "Page {page} has been deleted.",
     ja: "ページ {page} が削除されました。",
   },
   "toast.pageDeleteError": {
     en: "Cannot Delete Page",
     ja: "ページ削除不可",
   },
   "toast.pageDeleteErrorDesc": {
     en: "Cannot delete the last remaining page.",
     ja: "最後のページは削除できません。",
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
   // Pagination
   "pagination.previous": {
     en: "Previous",
     ja: "前へ",
   },
   "pagination.next": {
     en: "Next",
     ja: "次へ",
   },
   "pagination.page": {
     en: "Page",
     ja: "ページ",
   },
   "pagination.addPage": {
     en: "Add Page",
     ja: "ページ追加",
   },
   "pagination.deletePage": {
     en: "Delete Page",
     ja: "ページ削除",
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
     en: "Simple",
     ja: "シミュレーション",
   },
   "cmykMode.accurate": { // New key for accurate mode
     en: "Accurate",
      ja: "高精度",
    },
    // Export Scope
    "export.scope.current": {
      en: "Current Page",
      ja: "現在のページ",
    },
    "export.scope.all": {
      en: "All Pages",
      ja: "全ページ",
    },
    // Not Implemented Toast
    "toast.notImplementedTitle": {
      en: "Feature Not Implemented",
      ja: "機能未実装",
    },
    "toast.notImplementedDescAllPages": {
      en: "Exporting all pages is not yet supported. Only the current page will be exported.",
      ja: "全ページのエクスポートはまだサポートされていません。現在のページのみがエクスポートされます。",
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
 
   // Modify t function to accept replacements
   const t = (key: string, replacements?: Record<string, string | number>): string => {
     let translation = key; // Default to key if not found
     if (translations[key]) {
       translation = translations[key][locale];
     } else {
       console.warn(`Translation missing for key: ${key}`);
     }
 
     // Perform replacements if provided
     if (replacements) {
       Object.keys(replacements).forEach((placeholder) => {
         const regex = new RegExp(`\\{${placeholder}\\}`, 'g');
         translation = translation.replace(regex, String(replacements[placeholder]));
       });
     }
 
     return translation;
   }
 
   return { t, locale, setLocale }
 }
