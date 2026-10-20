// Shrinks a photo in the browser before upload so phone photos (5-10 MB)
// don't fill up the free storage quota. Output is always a JPEG, max 1280px.
export async function prepareImage(file, { maxDim = 1280, quality = 0.8, maxInputMB = 15 } = {}) {
  if (!file) return null

  if (!file.type || !file.type.startsWith('image/')) {
    throw new Error('Please choose an image file')
  }
  if (file.size > maxInputMB * 1024 * 1024) {
    throw new Error(`This photo is too large (max ${maxInputMB} MB)`)
  }

  try {
    const bitmap = await createImageBitmap(file)
    const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height))
    const width = Math.round(bitmap.width * scale)
    const height = Math.round(bitmap.height * scale)

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, width, height)
    ctx.drawImage(bitmap, 0, 0, width, height)

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
    if (!blob) throw new Error('Compression failed')

    const baseName = file.name.replace(/\.[^.]+$/, '') || 'photo'
    return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg' })
  } catch {
    // Could not process in the browser. Only allow the original if it is small.
    if (file.size > 5 * 1024 * 1024) {
      throw new Error('Could not process this photo. Please choose a smaller JPG or PNG.')
    }
    return file
  }
}
