import { Filesystem, Directory } from '@capacitor/filesystem'
import api from './api'

export async function fetchCbzAsBase64(url: string): Promise<string> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  const blob = await response.blob()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const result = reader.result as string
      resolve(result.split(',')[1])
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

export async function saveToDeviceStorage(
  mangaTitle: string,
  filename: string,
  base64Data: string
): Promise<void> {
  try {
    await Filesystem.mkdir({
      path: `manga-dl/${mangaTitle}`,
      directory: Directory.Documents,
      recursive: true,
    })
  } catch {
    // directory may already exist
  }

  try {
    await Filesystem.writeFile({
      path: `manga-dl/${mangaTitle}/${filename}`,
      data: base64Data,
      directory: Directory.Documents,
    })
  } catch (e: unknown) {
    if ((e as { message?: string })?.message?.includes('permission')) {
      alert('Storage permission denied. Please grant Files access in Settings.')
    } else {
      throw e
    }
  }
}

export function getCbzUrl(mangaTitle: string, filename: string): string {
  const base = api.defaults.baseURL || ''
  const apiKey = localStorage.getItem('manga-api-key') || ''
  return `${base}/library/file/${encodeURIComponent(mangaTitle)}/${encodeURIComponent(filename)}?api_key=${apiKey}`
}
