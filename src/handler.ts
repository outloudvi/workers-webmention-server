import config from './config'
import {
  canMatch,
  findAllValuesInJson,
  findLinkInHTML,
  generateResponse,
  isValidUrl,
  tryParse,
} from './utils'

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

export async function handleRequest(request: Request): Promise<Response> {
  if (
    request.headers.get('Content-Type') != 'application/x-www-form-urlencoded'
  ) {
    return generateResponse(
      400,
      `Invalid content type: ${request.headers.get('Content-Type')}`,
    )
  }
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

  if (!canMatch(source.host, config.acceptedDomains)) {
    return generateResponse(400, 'Target not allowed by this server')
  }

  source.hash = ''
  target.hash = ''

  const status = await validateSource(String(source), target)

  switch (status) {
    case 200:
      return new Response(`Good link: ${String(source)} -> ${String(target)}`, {
        status: 200,
      })
    case 500:
      return new Response(
        `Internal server error: ${String(source)} -> ${String(target)}`,
        {
          status: 500,
        },
      )
    default:
      return new Response(`Bad link: ${String(source)} -> ${String(target)}`, {
        status: 400,
      })
  }
}
