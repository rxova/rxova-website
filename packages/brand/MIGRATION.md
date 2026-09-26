# Migrating to @rxova/brand 1.0

1.0 reduces `@rxova/brand` to tokens, typefaces and project data. Everything
component-shaped moved to [`@rxova/astro-ui`](../astro-ui), unchanged apart from
its import path.

## 1. Install both

```sh
pnpm add @rxova/brand@^1 @rxova/astro-ui
```

## 2. Import the Starlight preset from astro-ui

```diff
- import { sharedStarlightConfig } from '@rxova/brand'
+ import { sharedStarlightConfig } from '@rxova/astro-ui/starlight'
```

Its options and output are the same. The component and stylesheet paths it
returns now point into `@rxova/astro-ui`.

## 3. Update direct imports

| 0.x                                                | 1.0                                          |
| -------------------------------------------------- | -------------------------------------------- |
| `@rxova/brand/components/<Chrome>.astro`           | `@rxova/astro-ui/components/<Chrome>.astro`  |
| `@rxova/brand/components/<Override>.astro`         | `@rxova/astro-ui/starlight/<Override>.astro` |
| `@rxova/brand/astro.css`                           | `@rxova/astro-ui/styles/document.css`        |
| `@rxova/brand/chrome.css`                          | `@rxova/astro-ui/styles/chrome.css`          |
| `@rxova/brand/starlight.css`                       | `@rxova/astro-ui/styles/starlight.css`       |
| `@rxova/brand/tokens.css`, `fonts.css`, `assets/*` | unchanged                                    |

`<Chrome>` is `SiteShell`, `Header`, `SiteFooter`, `ProjectSwitcher`,
`ThemeToggle` or `ThemeScript`. `<Override>` is `SiteTitle`, `SocialIcons`,
`Footer` or `ThemeSelect`.

## 4. Rename the short token aliases

`chrome.css` no longer defines the short aliases. Use the tokens directly:

| Alias                                                                        | Token                               |
| ---------------------------------------------------------------------------- | ----------------------------------- |
| `--bg` `--fg` `--muted` `--faint` `--rule` `--card` `--tag-bg` `--glow-tint` | `--rx-` + the same name             |
| `--font` / `--mono`                                                          | `--rx-font-sans` / `--rx-font-mono` |
| `--max`                                                                      | `--rx-max-wide`                     |
| `--accent`                                                                   | `--rx-fg`                           |

## 5. Peer dependencies

`@rxova/brand` no longer peers on `astro` or `@astrojs/starlight`;
`@rxova/astro-ui` does, with Starlight optional.
