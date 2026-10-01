import { describe, expect, it } from 'vitest'
import {
  bytesToBase64,
  formatAttachmentSize,
  pastedImageName,
  readDoorayAttachment
} from './dooray-task-attachments'

describe('dooray task attachments', () => {
  it('encodes bytes larger than one 32KB chunk', () => {
    const bytes = new Uint8Array(70_000).map((_, i) => i % 256)
    expect(bytesToBase64(bytes)).toBe(Buffer.from(bytes).toString('base64'))
  })

  it('names unnamed pastes by timestamp', () => {
    expect(pastedImageName(1234)).toBe('paste-1234.png')
  })

  it('formats sizes', () => {
    expect(formatAttachmentSize(512)).toBe('512 B')
    expect(formatAttachmentSize(2048)).toBe('2 KB')
    expect(formatAttachmentSize(3 * 1024 * 1024)).toBe('3.0 MB')
  })

  it('reads a blob into an upload-ready attachment', async () => {
    const attachment = await readDoorayAttachment(
      new Blob([new Uint8Array([1, 2, 3])], { type: 'image/png' }),
      'shot.png'
    )
    expect(attachment).toMatchObject({
      name: 'shot.png',
      mimeType: 'image/png',
      size: 3,
      dataBase64: 'AQID'
    })
    expect(attachment.id).toBeTruthy()
  })
})
