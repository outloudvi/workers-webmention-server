import minimatch from 'minimatch'
import cheerio from 'cheerio'
import { CORS_HEADERS, KV_STORAGE_PREFIX } from './consts'

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
  return obj
    .map(function (this: any) {
      return $(this).attr(attrname)
    })
    .get()
}

export function generateResponse(code: number, message: string): Response {
  return new Response(message, {
    headers: CORS_HEADERS,
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
    return atString(url) === atString(tar)
  } catch (_) {
    return false
  }
}
export function findLinkInHTML(html: string, dst: URL, base: string): boolean {
  const $ = cheerio.load(html)
  const urls = [
    ...collectAttr($, $('a'), 'href'),
    ...collectAttr($, $('img'), 'href'),
    ...collectAttr($, $('video'), 'src'),
  ]
  for (const i of urls) {
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

export function atString(url: URL): string {
  // @ts-ignore
  const u = new URL(url)
  u.hash = ''
  const final = String(u).replace(/#$/, '')
  if (!final.replace('//', '').includes('/')) {
    // Return https://example.com/ instead of https://example.com
    return final + '/'
  }
  return final
}
