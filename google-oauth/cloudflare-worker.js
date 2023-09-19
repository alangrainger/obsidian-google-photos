const redirectUrl = 'https://google-auth.obsidianshare.com'
const obsidianHandler = 'google-photos'

export default {
  async fetch (request, env, ctx) {
    if (request.method === 'GET') {
      return getHandler(...arguments)
    } else if (request.method === 'POST') {
      return postHandler(...arguments)
    }
  }
}

async function getHandler (request, env, ctx) {
  const { searchParams } = new URL(request.url)
  if (['state', 'code', 'scope'].every(param => searchParams.has(param))) {
    // This is the initial response from Google with the code.
    // Transparently pass this back to Obsidian
    return sendToObsidian(obsidianHandler, {
      function: 'getAccessToken',
      state: searchParams.get('state'),
      code: searchParams.get('code'),
      scope: searchParams.get('scope')
    })
  }
}

async function postHandler (request, env, ctx) {
  const contentType = request.headers.get('content-type')
  if (!contentType || !contentType.includes('application/json')) {
    return new Response(null, { status: 400 })
  }
  const data = await request.json()

  switch (data.action) {
    case 'getAccessToken':
      return getAccessToken(data.code, env)
    case 'refreshToken':
      return refreshToken(data.refreshToken, env)
  }
}

async function getAccessToken (code, env) {
  const url = new URL('https://oauth2.googleapis.com/token')
  url.search = new URLSearchParams({
    code,
    client_id: env.GOOGLE_PHOTOS_CLIENT_ID,
    client_secret: env.GOOGLE_PHOTOS_CLIENT_SECRET,
    redirect_uri: redirectUrl,
    grant_type: 'authorization_code'
  }).toString()
  return tokenResponse(url.href)
}

async function refreshToken (token, env) {
  const url = new URL('https://oauth2.googleapis.com/token')
  url.search = new URLSearchParams({
    refresh_token: token,
    client_id: env.GOOGLE_PHOTOS_CLIENT_ID,
    client_secret: env.GOOGLE_PHOTOS_CLIENT_SECRET,
    grant_type: 'refresh_token'
  }).toString()
  return tokenResponse(url.href)
}

async function tokenResponse (url) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  })
  if (res.status === 200) {
    const token = await res.json()
    return new Response(
      JSON.stringify({
        accessToken: token.access_token || null,
        refreshToken: token.refresh_token || null,
        expiresIn: token.expires_in || 0
      }),
      {
        headers: {
          'content-type': 'application/json'
        }
      }
    )
  } else {
    return res
  }
}

function sendToObsidian (handler, params) {
  const url = new URL('obsidian://' + handler)
  url.search = new URLSearchParams(params).toString()
  return Response.redirect(url, 302)
}
