import { fetch } from 'undici';
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
  }

  public async makeRequest<T>(endpoint: string, disableBaseUri: boolean = false): Promise<T> {
    if (Date.now() >= this.nextRenew) {
      await this.renewToken();
    }

    const request = await fetch(disableBaseUri ? endpoint : `${BASE_URL}${endpoint}`, {
      headers: { Authorization: this.token },
    });
    
    return await request.json();
  }

  private async renewToken(): Promise<void> {
    const res = await fetch('https://accounts.spotify.com/api/token?grant_type=client_credentials', {
      method: 'POST',
      headers: {
        Authorization: this.authorization,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const { access_token, expires_in } = (await res.json()) as {
      access_token?: string;
      expires_in: number;
    };

    if (!access_token) throw new KazagumoError(3, 'Failed to get access token due to invalid spotify client');

    this.token = `Bearer ${access_token}`;
    this.nextRenew = expires_in * 1000;
  }
}
