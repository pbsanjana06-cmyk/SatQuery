import type { UploadedImage } from '../types'

export const uploadImageToStorage = async (file: File, bucket = 'satellite-images') => {
  const imageUrl = URL.createObjectURL(file)

  const uploaded: UploadedImage = {
    id: crypto.randomUUID(),
    name: file.name,
    url: imageUrl,
    type: 'optical',
    size: file.size,
    width: 1200,
    height: 900,
  }

  return { uploaded, bucket }
}

export const validateImageFile = (file: File) => {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/tiff', 'image/tif']
  if (!validTypes.includes(file.type) && !file.name.toLowerCase().match(/\.(tif|tiff|jpg|jpeg|png)$/)) {
    return 'Unsupported image format. Use JPG, JPEG, PNG, TIFF, or GeoTIFF.'
  }

  if (file.size > 20 * 1024 * 1024) {
    return 'File is too large. Please upload a file under 20MB.'
  }

  return null
}
