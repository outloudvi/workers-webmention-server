import { CORS_HEADERS, KV_STORAGE_PREFIX } from './consts'
import {
  canMatch,
  findAllValuesInJson,
  findLinkInHTML,
  generateResponse,
  isValidUrl,
  tryParse,
  updateStorage,
} from './utils'

const allowedDomains = ALLOWED_DOMAINS.split('|')

async function validateSource(src: string, dst: URL): Promise<number> {
  // Source page analysis
  const sourcePage = await fetch(String(src), {
    // TODO: limit redirect count
    redirect: 'follow',
    headers: {
      'User-Agent':
        'Workers-Webmention-Server/1.0; https://github.com/outloudvi/cf-workers-webmention-server',
    },
  }).catch((_) => undefined)

  if (!sourcePage) {
    return 500
  }

  const textIt = await sourcePage.text().catch(() => '')

  // Is it JSON?
  const jsonIt = tryParse(textIt)
  if (jsonIt) {
    return findAllValuesInJson(jsonIt, dst) ? 200 : 400
  }

  return findLinkInHTML(textIt, dst, src) ? 200 : 400
}

async function processWebmentionScan(request: Request): Promise<Response> {
  const formData = await request.formData().catch((_) => undefined)
  if (!formData) {
    return generateResponse(400, 'Invalid form data')
  }
  const src = String(formData.get('source') || '')
  const trg = String(formData.get('target') || '')
  if (!src) {
    return generateResponse(400, 'Source not found')
  }
  if (!trg) {
    return generateResponse(400, 'Target not found')
  }
  if (!isValidUrl(src)) {
    return generateResponse(400, 'Invalid source')
  }
  if (!isValidUrl(trg)) {
    return generateResponse(400, 'Invalid target')
  }

  const source = new URL(src)
  const target = new URL(trg)

  // Validation part
  // Not part of the spec. Feel free to change them if you don't like it.

  if (source.host === target.host) {
    return generateResponse(400, 'Same-site webmention is meaningless')
  }

  if (!canMatch(target.host, allowedDomains)) {
    return generateResponse(400, 'Target not allowed by this server')
  }

  // Validation part ends

  source.hash = ''
  target.hash = ''

  const status = await validateSource(String(source), target)

  await updateStorage(String(source), String(target), status)

  switch (status) {
    case 200:
      return generateResponse(
        200,
        `Good link: ${String(source)} -> ${String(target)}`,
      )
    case 500:
      return generateResponse(
        500,
        `Internal server error: ${String(source)} -> ${String(target)}`,
      )
    default:
      return generateResponse(
        400,
        `Bad link: ${String(source)} -> ${String(target)}`,
      )
  }
}

export async function handleRequest(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') {
    // CORS
    return generateResponse(204, '')
  }
  if (
    request.headers.get('Content-Type') === 'application/x-www-form-urlencoded'
  ) {
    // Webmention API
    return await processWebmentionScan(request)
  }

  if (request.method === 'GET') {
    // Webmention data API
    const req = new URL(request.url)
    const url = req.searchParams.get('url')
    if (url === null || !isValidUrl(url)) {
      return generateResponse(400, 'Bad request: invalid URL')
    }
    const urlObj = new URL(url)
    urlObj.hash = ''
    if (canMatch(urlObj.host, allowedDomains)) {
      const key = KV_STORAGE_PREFIX + String(urlObj)
      let val = (await KV.get(key)) || '[]'
      try {
        let urlList: string[] = JSON.parse(val)
        urlList = urlList.map((x) => x.replace(/#$/, ''))
        val = JSON.stringify(urlList)
      } catch (_) {
        //
      }
      return new Response(val, {
        headers: {
          'Content-Type': 'application/json',
          ...CORS_HEADERS,
        },
      })
    } else {
      return generateResponse(400, 'Bad request: URL not in allowed list')
    }
  }

  return generateResponse(400, `Bad request`)
}
