# MJR Scholarships & Fellowships

Static, embeddable scholarship directory for Media Jobs Report. It supports media-focused and general scholarships, school-specific opportunities, deadline status, search, sorting, and filters.

## Upload and run

1. Upload every file in this repository to GitHub.
2. Open **Actions** and run **Update scholarship directory**.
3. The build writes the validated feed to `public/scholarships.json`.
4. Host the `public` folder with GitHub Pages or your existing static host.

For a local preview:

```bash
npm run build
npm run serve
```

## Add an opportunity

Edit `data/scholarships.manual.json`. Required fields are `id`, `title`, `provider`, `programGroup`, `categories`, `url`, and `sourceUrl`. Dates use `YYYY-MM-DD`. Use `null` when a deadline has not yet been announced. Set `institutionSpecific` to `true` for awards restricted to one school.

The build rejects duplicate IDs, invalid URLs, invalid dates, unknown categories, and missing required fields. Expired records remain in the source but are excluded from the public feed unless `recurring` is true and the next deadline is not yet known.

## CareerOneStop

CareerOneStop currently advertises more than 9,500 scholarship and financial-aid opportunities, but its public API Explorer does not currently document a scholarship endpoint. This project deliberately does not scrape or call an undocumented endpoint. `scripts/import-careeronestop.js` is a safe adapter placeholder for use after an approved data method is confirmed.

## Embed

Use the full page at `public/index.html`, or place this on an MJR page:

```html
<div id="mjr-scholarships"></div>
<script src="https://YOUR-HOST.example/embed.js" data-target="mjr-scholarships"></script>
```

The embed script loads its CSS and JSON from the same folder as `embed.js`.
