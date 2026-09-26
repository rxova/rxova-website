/** @rxova/brand — the project data behind rxova.org. Stylesheets are subpath exports (`@rxova/brand/tokens.css`). */

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
  projectFromBase,
  type Project,
  type ProjectId,
  type RepoId,
} from './sites.ts'

export { renderFeed, escapeXml, rfc822, type FeedItem, type FeedOptions } from './feed.ts'
