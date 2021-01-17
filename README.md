# Webmention Server for Cloudflare Workers

## Config
* `ALLOWED_DOMAINS`: Allowed target domains. Glob is allowed. Split multi target domains with `|`.

## API

* `GET /?url=[url]`

  Get all webmentions to a URL.

* `POST /`

  Post a webmention message to a URL.

## License

MIT