const blockedTerms = [
  '诈骗',
  '赌博',
  '毒品',
  '枪支',
  '色情',
  '卖淫',
  '刷单',
  '代考',
  '假证',
  '外挂',
  '违禁品',
]

export function findBlockedTerm(values: Array<string | undefined>) {
  const content = values.filter(Boolean).join('\n').toLowerCase()

  return blockedTerms.find((term) => content.includes(term)) ?? null
}

export async function validateImageContents(files: File[]) {
  for (const file of files) {
    const bytes = new Uint8Array(await file.arrayBuffer())
    const isJpeg = file.type === 'image/jpeg' && bytes[0] === 0xff && bytes[1] === 0xd8
    const isPng =
      file.type === 'image/png' &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47
    const isWebp =
      file.type === 'image/webp' &&
      String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' &&
      String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP'

    if (!isJpeg && !isPng && !isWebp) {
      return '图片内容与文件类型不匹配'
    }
  }

  return null
}
