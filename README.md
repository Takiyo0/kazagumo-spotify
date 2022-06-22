# kazagumo-spotify

## A spotify plugin for kazagumo module

## Accepted query

Track link; `https://open.spotify.com/track/7nw4ElerVAP5235FN5D2OI`  
Playlist link; `https://open.spotify.com/playlist/2gzszlY4WeJOTOUU6x3sgA`  
Album link; `https://open.spotify.com/album/18UoCkfQKlMVnAcZXbiBz8`   
Artist link; `https://open.spotify.com/artist/64tJ2EAv1R6UaZqc4iOCyj?si=mxc5IMM9RQeEPmY0KBIfjg`   
String; `mirror heart`


## Installation

> npm i kazagumo-spotify

## Links

- Kazagumo; [npm](https://www.npmjs.com/package/kazagumo) [github](https://github.com/Takiyo0/Kazagumo)
- Kazagumo-spotify; [npm](https://www.npmjs.com/package/kazagumo-spotify)

#### How to

```js
const { Kazagumo } = require('kazagumo');
const Spotify = require('kazagumo-spotify');

const kazagumo = new Kazagumo(
  {
    plugins: [
      new Spotify({
        clientId: '',
        clientSecret: '',
        playlistPageLimit: 1, // optional ( 100 tracks per page )
        albumPageLimit: 1, // optional ( 50 tracks per page )
        artistPageLimit: 1, // optional ( 50 tracks per page )
        searchLimit: 10 // optional ( track search limit. Max 50 )
      }),
    ],
  },
  new Connectors.DiscordJS(client),
  Nodes,
);

kazagumo.search(`https://open.spotify.com/track/7nw4ElerVAP5235FN5D2OI`); // track, album, playlist, artist
kazagumo.search('mirror heart', {engine: 'spotify'}) // search track using spotify
```
