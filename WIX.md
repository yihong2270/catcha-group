# Catcha Group site: Wix-ready build

This is the one-page site (live on GitHub Pages from the `main` branch) rebuilt as an **Astro 5** project. It is set up for **Wix-managed headless** hosting: Wix hosts this code on catchagroup.com, in place of the current Wix Editor site. It renders identically to the GitHub Pages version.

## Layout

| Path | What |
| --- | --- |
| `src/data/site.json` | All copy: hero, about, track record, principals, contact. Edit text here. |
| `src/pages/index.astro` | Page markup, rendered from `site.json`. |
| `src/layouts/Base.astro` | `<head>`: title, description, favicons, font. |
| `src/styles/site.css` | All styles. |
| `public/js/site.js` | Entrances, custom pointer, hands canvas, contact form. |
| `public/images/` | Logo, spiral, city photos, portraits, hand masks. |

Commands: `npm install`, `npm run dev`, `npm run build` (writes to `dist/`).

## Porting to the existing Wix site

Prerequisites:
- Node **24.22.1 or later** (required by the Wix CLI).
- Access to the Wix account that owns catchagroup.com. The domain must be connected to that site.
- The Wix MCP or Wix plugin connected. The Wix skills install with `npx skills add wix/skills`.

Steps:

1. **Start the move.** In the catchagroup.com dashboard, start *Move to a custom frontend* (Headless settings). This creates a separate preview site. The live domain keeps serving the Editor site until step 7.
2. **Link this project.** Run the CLI command the dashboard gives (or `npm create @wix/new@latest -- headless link`). Then run `wix env pull` so `.env.local` holds the parent site's client ID.
3. **Contact form.** The form currently opens the visitor's email app (`mailto`). Change it to post to the site's existing Wix Form:
   - Use the **same form ID** as the Editor site's contact form, so contacts, automations and notification emails keep working.
   - Post with `submissions.createSubmission()` from `@wix/forms`. Move the submit handler from `public/js/site.js` into a module `<script>` in `index.astro` so it can import the SDK.
   - Map `first`, `last`, `email` and `message` to that form's field targets.
   - Change the thank-you text, which currently says the email app has opened.
4. **SEO.**
   - Set the home page title and description in **SEO & GEO → SEO Settings → Main Pages**.
   - After linking, check the page source for duplicate `<title>` or description tags. If Wix injects them, remove ours from `Base.astro`.
   - Optionally upload the images to the Wix Media Manager and switch to their `wixstatic.com` URLs.
5. **Redirects.** Before switching, list the old URLs from `https://www.catchagroup.com/sitemap.xml` (e.g. the About and Contact pages). Then add 301s to `/` in the URL Redirect Manager. After the switch, those old pages return 404.
6. **Cookie consent.** A new headless site defaults to granting every cookie category. Set the policy and banner before going live if it is needed.
7. **Preview, then go live.**
   - Run `npm run build` and `npx wix release`, then check the preview URL on desktop and phone.
   - When it's approved, open **Complete Migration** in the dashboard and run `wix finalize-migration`, using only the flags that dialog gives.
8. **Afterwards.** Retire or no-index the GitHub Pages copy, so search engines don't see two copies of the same site.

**Rollback.** The Editor site's pages and Velo files stay on the account. Switching back is possible where the Wix plan allows it.

## References

- Moving an existing site to a custom frontend: https://dev.wix.com/docs/go-headless/wix-managed-headless/about-wix-managed-headless
- Post-migration checklist: https://dev.wix.com/docs/go-headless/wix-managed-headless/full-integration-astro/get-started/post-migration-checklist-wix-studio-and-editor-sites-to-headless
- Linking an existing Astro project: https://dev.wix.com/docs/go-headless/wix-managed-headless/full-integration-astro/get-started/connect-an-existing-astro-project
- Form Submissions API: https://dev.wix.com/docs/api-reference/crm/forms/form-submissions/introduction
