// Local sync server actions removed for Vercel optimization (serverless bandwidth & ephemeral disk constraints)
export async function uploadSyncSnapshot() {
  return { success: false, error: 'Disabled for Vercel serverless hosting' }
}

export async function downloadSyncSnapshot() {
  return { success: false, error: 'Disabled for Vercel serverless hosting' }
}

export async function getSyncQrCode() {
  return { success: false, error: 'Disabled for Vercel serverless hosting' }
}
