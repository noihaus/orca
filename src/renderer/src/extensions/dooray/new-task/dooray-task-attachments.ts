export type DoorayPendingAttachment = {
  id: string
  name: string
  mimeType: string
  size: number
  dataBase64: string
}

// Spread-into-fromCharCode overflows the call stack past ~64K args, so encode in 32KB chunks.
const BASE64_CHUNK = 32_768

export function bytesToBase64(bytes: Uint8Array): string {
  const parts: string[] = []
  for (let offset = 0; offset < bytes.length; offset += BASE64_CHUNK) {
    parts.push(String.fromCharCode(...bytes.subarray(offset, offset + BASE64_CHUNK)))
  }
  return btoa(parts.join(''))
}

export function formatAttachmentSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`
  }
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function pastedImageName(timestamp: number): string {
  return `paste-${timestamp}.png`
}

let attachmentSeq = 0

export async function readDoorayAttachment(
  blob: Blob,
  name: string
): Promise<DoorayPendingAttachment> {
  const bytes = new Uint8Array(await blob.arrayBuffer())
  attachmentSeq += 1
  return {
    id: `attachment-${attachmentSeq}`,
    name,
    mimeType: blob.type,
    size: bytes.byteLength,
    dataBase64: bytesToBase64(bytes)
  }
}
