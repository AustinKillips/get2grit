# Article QR destination

The existing QR encodes https://get2grit.bike/qr/movie/. Keep that path even though it now serves the article.

To publish the article destination, edit `destination.json`, replacing the empty string with the article's full HTTPS URL, then commit and push to main. You can also edit that file in GitHub's web editor. Leave `url` empty to show the coming-soon page again. No QR reprint is needed.

Example:

```json
{"url": "https://example.com/your-article"}
```
