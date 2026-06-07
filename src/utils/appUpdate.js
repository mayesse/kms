import { isElectron } from '../lib/adapters/storageConfig'

const GITHUB_API = 'https://api.github.com/repos/mayesse/kms/releases/latest'
const APP_VERSION = '2.1.0'

export async function checkForUpdate() {
  try {
    if (isElectron()) {
      const result = await window.gc.checkForUpdates()
      return result
    }
    const res = await fetch(GITHUB_API)
    if (!res.ok) return { updateAvailable: false }
    const release = await res.json()
    const latest = release.tag_name?.replace(/^v/, '') || ''
    const current = APP_VERSION
    if (!latest) return { updateAvailable: false }
    const isNewer = compareVersions(latest, current) > 0
    return {
      updateAvailable: isNewer,
      version: latest,
      downloadUrl: `https://github.com/mayesse/kms/releases/latest/download/GreenCrownPOS.apk`,
    }
  } catch {
    return { updateAvailable: false }
  }
}

function compareVersions(a, b) {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] || 0
    const nb = pb[i] || 0
    if (na > nb) return 1
    if (na < nb) return -1
  }
  return 0
}
