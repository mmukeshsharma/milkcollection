'use server'

import { connectToDatabase } from '@/lib/mongodb'
import { Setting } from '@/models'

// Server-side in-memory cache for language setting to avoid repeated DB hits on Vercel
let cachedLanguage: string | null = null

export async function getLanguageSetting(): Promise<string> {
  if (cachedLanguage !== null) {
    return cachedLanguage
  }
  try {
    await connectToDatabase()
    const setting = await Setting.findOne({ key: 'language' })
    const lang = setting ? String(setting.value) : 'en'
    cachedLanguage = lang
    return lang
  } catch (error) {
    console.error('Error getting language setting:', error)
    return 'en'
  }
}

export async function saveLanguageSetting(lang: string): Promise<{ success: boolean; error?: string }> {
  try {
    await connectToDatabase()
    await Setting.findOneAndUpdate(
      { key: 'language' },
      { value: lang },
      { upsert: true, new: true }
    )
    cachedLanguage = lang
    return { success: true }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed to save setting'
    return { success: false, error: msg }
  }
}
