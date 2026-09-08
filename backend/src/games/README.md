# Game Media

Each game folder owns its page media in `gameData.json`.

```json
{
  "image": "/api/games/assets/My Game/cover.webp",
  "screenshots": [
    "/api/games/assets/My Game/screenshot-1.webp",
    "/api/games/assets/My Game/screenshot-2.webp"
  ],
  "videos": [
    "/api/games/assets/My Game/trailer.mp4"
  ]
}
```

- `image` is the cover shown on cards and the detail page.
- `screenshots` is the image gallery.
- `videos` is the video gallery. Videos appear after the screenshots.
- Put the files in the same game folder and update only these paths when replacing media.
- Supported browser video formats are `.mp4`, `.webm`, and `.ogg`.

The current Drive workflow is:

1. Upload the `backend/src/games` folder into `WEB_GAME_ASSETS` as `games`.
2. Run `npm run sync-games-drive-urls` from `backend`.
3. Run `npm run load-games` so MongoDB receives the updated Drive URL.

After adding or replacing a local asset, repeat those three steps. Local copies remain in
the repository as the editable source files.
