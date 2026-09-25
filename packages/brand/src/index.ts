/**
 * @rxova/brand — design tokens, Starlight theme and shared chrome for rxova.org.
 *
 * Stylesheets and components are reached through their own subpath exports
 * (`@rxova/brand/tokens.css`, `@rxova/brand/components/SiteFooter.astro`) so this
 * entry point stays importable from `astro.config.mjs` under plain Node.
 */

export {
  RXOVA_ORIGIN,
  PROJECTS,
  REPOS,
  REPO_IDS,
  getProject,
  getRepo,
  docsUrl,
  siteUrl,
  canonicalUrl,
  type Project,
  type ProjectId,
  type RepoId,
} from './sites.ts'

export { sharedStarlightConfig, type SharedStarlightOptions } from './starlight.ts'

export { renderFeed, escapeXml, rfc822, type FeedItem, type FeedOptions } from './feed.ts'
