import config from '../redirects.json'

interface RedirectHandler {
  domain: string
  matchers: { [key: string]: { destination: string } }
}

export const redirectHandlers: RedirectHandler[] = config

const sanitizeForRegex = (input: string) =>
  input.replace(/([.?*+^$[\]\\(){}|-])/g, '\\$1')

export async function handleRequest(req: Request): Promise<Response> {
  console.log({
    url: req.url,
  })

  for (const data of redirectHandlers) {
    const domain = sanitizeForRegex(data.domain)
    const baseMatch = req.url.match(
      new RegExp(`^https?\\:\\/\\/${domain}\\/?$`, 'g'),
    )

    if (baseMatch?.length) {
      console.log(
        `Base match found for domain ${data.domain}. Doing base redirect (if it exists!)`,
      )
      return doRedirect(data.matchers.base?.destination)
    }

    for (const matcherName in data.matchers) {
      if (matcherName === 'base') continue

      const matcher = data.matchers[matcherName]
      const matchKey = sanitizeForRegex(matcherName)

      console.log(
        `Testing against ${matcherName} (${matcherName}.${data.domain} | ${data.domain}/${matcherName})`,
      )

      const expression = `^https?\\:\\/\\/(?:(${matchKey})\\.)?${domain}(?:\\/(${matchKey}))?\\/?$`
      // console.log({ resultExpression: expression })

      const match = req.url.match(new RegExp(expression))
      const groups = match
        ?.slice(1)
        .filter((matchValue) => typeof matchValue === 'string')
      // console.log({ match })

      if (match?.length && groups?.includes(matcherName)) {
        console.log(
          `Match found for ${matcherName}. Redirecting to ${matcher.destination}`,
        )
        return doRedirect(matcher.destination)
      }
    }
  }

  return new Response('Not Found', { status: 404 })
}

interface RedirectOptions {
  permanent?: boolean
}

function doRedirect(
  destination: string,
  options: RedirectOptions = { permanent: false },
) {
  return new Response(`Redirecting to ${destination}. Please wait...`, {
    status: options.permanent ? 301 : 302,
    headers: {
      Location: destination,
    },
  })
}
