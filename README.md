# GRIT FEST guide

Static festival guide. Publish with GitHub Pages: Settings → Pages → Deploy from a branch → main → / (root).

The guide is at https://get2grit.bike/ and the splash page is welcome.html.

## Embed on the nonprofit website

```html
<iframe src="https://get2grit.bike/index.html#schedule"
  title="GRIT FEST festival guide" loading="lazy"
  style="display:block;width:100%;height:90vh;min-height:600px;border:0"></iframe>
<p><a href="https://get2grit.bike/" target="_blank" rel="noopener">Open the festival guide in a new tab</a></p>
```

The iframe scrolls independently. The direct link provides a full-screen alternative. Payment and third-party route widgets should be checked on the embedding website before promoting them.

## Content updates

The admin editor runs locally, not on GitHub Pages. Save changes in the local editor, run scripts/package_site.py in the authoring project, and replace the published files with the new release. Never upload admin backups or the local server.
