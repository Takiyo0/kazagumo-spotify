import petitio from 'petitio';
import { SpotifyOptions } from './Plugin';
import { KazagumoError } from 'kazagumo';

const BASE_URL = 'https://api.spotify.com/v1';

export class RequestManager {
  private token: string = '';
  private authorization: string = '';
  private nextRenew: number = 0;

  constructor(private options: SpotifyOptions) {
    this.authorization = `Basic ${Buffer.from(`${this.options.clientId}:${this.options.clientSecret}`).toString(
      'base64',
    )}`;

    this.renewToken();
  }

  public async makeRequest<T>(endpoint: string, disableBaseUri: boolean = false): Promise<T> {
    await this.renew();

    return await petitio(disableBaseUri ? endpoint : `${BASE_URL}${endpoint}`)
      .header('Authorization', this.token)
      .json();
  }

  private async renewToken(): Promise<number> {
    const { access_token, expires_in } = await petitio('https://accounts.spotify.com/api/token', 'POST')
      .query('grant_type', 'client_credentials')
      .header('Authorization', this.authorization)
      .header('Content-Type', 'application/x-www-form-urlencoded')
      .json();

    if (!access_token) throw new KazagumoError(3, 'Failed to get access token due to invalid spotify client');

    this.token = `Bearer ${access_token}`;
    this.nextRenew = expires_in * 1000;
  }

  private async renew(): Promise<void> {
    if (this.nextRenew > Date.now()) {
      await this.renewToken();
    }
  }
}
