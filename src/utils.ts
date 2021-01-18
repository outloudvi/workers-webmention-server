import minimatch from 'minimatch'
import cheerio from 'cheerio'
import { KV_STORAGE_PREFIX } from './consts'

export function tryParse(text: string): Record<string, any> | null {
  try {
    return JSON.parse(text)
  } catch (_) {
    return null
  }
}

export function canMatch(tar: string, lst: string[]): boolean {
  for (const i of lst) {
    if (minimatch(tar, i)) return true
  }
  return false
}
export function collectAttr($: any, obj: any, attrname: string): string[] {
  const ret: string[] = []
  obj.each((_: any, e: any) => ret.push($(e).attr(attrname)))
  return ret
}
export function generateResponse(code: number, message: string): Response {
  return new Response(message, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    },
    status: code,
  })
}
export function isValidUrl(url: string): boolean {
  try {
    const urled = new URL(url)
    return urled.protocol === 'http:' || urled.protocol === 'https:'
  } catch (_) {
    return false
  }
}
export function matchURLExceptHash(str: string, tar: URL): boolean {
  try {
    const url = new URL(str)
    url.hash = ''
    tar.hash = ''
    return String(url) === String(tar)
  } catch (_) {
    return false
  }
}
export function findLinkInHTML(html: string, dst: URL, base: string): boolean {
  const $ = cheerio.load(html)
  for (const i of [
    ...collectAttr($, $('a'), 'href'),
    ...collectAttr($, $('img'), 'href'),
    ...collectAttr($, $('video'), 'src'),
  ]) {
    const absoluteUrl = String(new URL(i, base))
    if (matchURLExceptHash(absoluteUrl, dst)) {
      return true
    }
  }
  return false
}
export function findAllValuesInJson(
  jsonIt: Record<string, any>,
  dst: URL,
): boolean {
  if (Array.isArray(jsonIt)) {
    return false
  }
  for (const i of Object.values(jsonIt)) {
    switch (typeof i) {
      case 'object': {
        if (findAllValuesInJson(i, dst)) {
          return true
        }
      }
      default: {
        if (matchURLExceptHash(String(i), dst)) {
          return true
        }
      }
    }
  }
  return false
}

export async function updateStorage(
  source: string,
  target: string,
  status: number,
) {
  const add = status === 200
  const key = KV_STORAGE_PREFIX + target
  const cur: string[] = JSON.parse((await KV.get(key)) || '[]')
  if (add) {
    if (!cur.includes(source)) {
      cur.push(source)
      await KV.put(key, JSON.stringify(cur))
    }
  } else {
    if (cur.includes(source)) {
      cur.splice(cur.indexOf(source), 1)
      await KV.put(key, JSON.stringify(cur))
    }
  }
}
