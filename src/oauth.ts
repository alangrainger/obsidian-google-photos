import { moment, Notice, ObsidianProtocolData, Platform, requestUrl } from 'obsidian'
import GooglePhotos from './main'

const serviceUrl = 'https://google-auth.obsidianshare.com'

export default class OAuth {
  plugin: GooglePhotos
  private readonly callbackUrl = 'https://localhost/google-photos'

  constructor (plugin: GooglePhotos) {
    this.plugin = plugin
  }

  async authenticate (): Promise<boolean> {
    const s = this.plugin.settings
    // First attempt to use a stored refresh token
    if (s.refreshToken) {
      console.log('Google Photos: attempting refresh token')
      if (await this.getAccessToken({
        refresh_token: s.refreshToken,
        client_id: s.clientId,
        client_secret: s.clientSecret,
        grant_type: 'refresh_token'
      })) {
        // Successfully refreshed our access
        console.log('success')
        return true
      } else {
        // Refresh token is no longer valid
        s.refreshToken = ''
      }
    }
    // If we can't refresh the access token, launch a full permissions request
    console.log('Google Photos: attempting permissions')
    this.requestCode()
    return false
  }

  /**
   * This function works asynchronously and receives the result via an Obsidian Protocol Handler.
   * The result is picked up in the handler and set to getAccessToken()
   */
  requestCode (): void {
    const codeUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    codeUrl.search = new URLSearchParams({
      scope: 'https://www.googleapis.com/auth/photoslibrary.readonly',
      include_granted_scopes: 'true',
      response_type: 'code',
      access_type: 'offline',
      state: 'state_parameter_passthrough_value',
      redirect_uri: 'https://google-auth.obsidianshare.com',
      client_id: '257180575925-p643qmm39evc9vd6i2k2lbcprcgr6ipa.apps.googleusercontent.com'
    }).toString()
    window.open(codeUrl)
  }

  /**
   * Exchange an authorisation code or a refresh token for an access token
   */
  async getAccessToken (code: string): Promise<boolean> {
    console.log('getting cvode')
    const res = await requestUrl({
      url: serviceUrl,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: 'getAccessToken',
        code
      })
    })
    if (res.status === 200) {
      this.plugin.settings.accessToken = res.json.accessToken
      if (res.json.refresh_token) {
        this.plugin.settings.refreshToken = res.json.refreshToken
      }
      this.plugin.settings.expires = moment().add(res.json.expiresIn, 'second').format()
      await this.plugin.saveSettings()
      return true
    }
    return false
  }
}
