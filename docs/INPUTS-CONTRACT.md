# The docs ingest contract

How a project's docs get onto **rxova.org**. This is the contract a source repo
(`rxova/journey`, `rxova/react-inputs`, `rxova/use-everywhere`, and any future
package) implements — **gate 1**, the sender. The aggregator's half — **gate 2**,
validate and persist — lives in [`scripts/ingest.mjs`](../scripts/ingest.mjs) and
[`.github/workflows/ingest.yml`](../.github/workflows/ingest.yml).

The aggregator **never builds your docs**. It never checks your repo out and never
runs your toolchain. You build your docs, upload them, and tell it where they are;
it validates and publishes them. Schema 2 makes the public document shell the one
exception to “publish verbatim”: the aggregator composes each rendered body into
the rxova-website header, footer and head before deploy.

## What a source repo must do

On a push to its default branch, after its docs build succeeds:

1. **Build the docs for the right base URL.** They must be built to live at
   `/packages/<id>/` — the aggregator only relocates the tree, it never rewrites
   asset paths, so a build made for `/` will 404 every asset once deployed. The
   house convention is a `DOCS_BASE_URL` env var the docs framework reads
   (`base: process.env.DOCS_BASE_URL ?? '/'`).

2. **For schema 2, write `rxova-page-bundle.json` at the dist root.** It identifies
   the artifact as `html-page-component`, names the project and repeats the base.
   Built HTML must contain page UI and a `<main>`, but no global Rxova header,
   `SiteFooter` or Cloudflare beacon. Starlight's search/sidebar/page navigation
   remain page UI and are preserved.

3. **Upload the built dist as a workflow artifact named `docs-dist`.** The
   artifact's root must be the dist root — i.e. `index.html` sits at the top of
   the artifact, not under a subdirectory. This is the fixed name the aggregator
   downloads by; do not rename it.

4. **Fire a `repository_dispatch` at `rxova/rxova-website`** with event type
   `docs` and the payload below.

### The dispatch payload

```jsonc
{
  "event_type": "docs",
  "client_payload": {
    "schema": 2, //   rendered PageComponent contract; schema 1 is legacy full-site HTML
    "project": "use-everywhere", // your id, exactly as it appears in sources.json
    "ref": "main", //  the branch or tag the docs were built from
    "sha": "<full or short commit sha>", // the exact commit
    "run_id": "${{ github.run_id }}", // the run holding your docs-dist artifact
    "base": "/packages/use-everywhere/", // optional; if sent, must equal the derived base
    "framework": "astro", //             optional; astro | docusaurus | other
  },
}
```

`base` is optional but recommended: sending it turns a wrong-base build into a
clean rejection at gate 2a instead of a broken page. `framework` is informational.

### A reference sender job

```yaml
notify-aggregator:
  needs: build-docs # whatever job produced your dist
  runs-on: ubuntu-latest
  steps:
    - uses: actions/download-artifact@v8 # your own dist, from an earlier job
      with:
        name: docs-dist
        path: dist
    # or build it here; the point is `dist/` holds index.html at its root

    - uses: actions/upload-artifact@v7
      with:
        name: docs-dist
        path: dist
        if-no-files-found: error

    - name: Notify rxova.org
      env:
        GH_TOKEN: ${{ secrets.AGGREGATOR_DISPATCH_TOKEN }}
      run: |
        gh api repos/rxova/rxova-website/dispatches \
          -f event_type=docs \
          -F 'client_payload[schema]=2' \
          -F 'client_payload[project]=use-everywhere' \
          -F "client_payload[ref]=${GITHUB_REF_NAME}" \
          -F "client_payload[sha]=${GITHUB_SHA}" \
          -F "client_payload[run_id]=${GITHUB_RUN_ID}" \
          -F 'client_payload[base]=/packages/use-everywhere/' \
          -F 'client_payload[framework]=astro'
```

## What gate 2 does with it

1. **2a — metadata** ([`validateDispatch`](../scripts/ingest.mjs)). Rejects an
   unsupported `schema`; an unknown `project`, or one disabled in `sources.json`; a
   `base` that disagrees with the derived `/packages/<id>/`; a `ref`, `sha` or
   `run_id` that is not shaped like one. It also re-asserts that the mount derived
   from the id is unique and stays inside the tree.
2. **Download** the `docs-dist` artifact from your `run_id`, in your repo.
3. **2b — contents** ([`checkDist`](../scripts/ingest.mjs)). Rejects a dist that is
   missing, empty, has no `index.html`, has a mismatched schema-2 manifest, or puts
   global chrome/analytics back into a PageComponent.
4. **Persist.** Packs the dist and stores it as the project's canonical release
   asset — tag `content-<id>`, asset `docs-<id>.tgz` — replacing the previous one.
5. **Deploy.** Reassembles the whole site from every enabled project's persisted
   docs and publishes to Pages. Schema-2 HTML is composed into the source-specific
   website shell; non-HTML assets are copied unchanged. Only your project changed;
   the rest are served from their last persisted dist, not rebuilt.

A rejection at any gate fails the ingest run and **leaves the live site
untouched** — a bad push cannot take rxova.org down, it just does not publish.

## Tokens

| Secret                      | Lives in         | Scope                                                      | Used for                                           |
| --------------------------- | ---------------- | ---------------------------------------------------------- | -------------------------------------------------- |
| `AGGREGATOR_DISPATCH_TOKEN` | each source repo | fine-grained PAT, Contents: write on `rxova/rxova-website` | firing the `docs` dispatch                         |
| `SOURCE_ARTIFACTS_TOKEN`    | `rxova-website`  | fine-grained PAT, Actions: read on the source repos        | downloading a sender's `docs-dist` artifact by run |

## Adding a new package (the two gates in practice)

1. **Gate 1 — the new repo sends.** Add the sender job above to its docs CI:
   build at `/packages/<id>/`, upload `docs-dist`, dispatch `docs` with the
   payload. Nothing about the aggregator changes for it to be _able_ to send.
2. **Gate 2 — this repo accepts.** Add one entry to
   [`sources.json`](../sources.json) (`id`, `enabled: true`, `landing`) and the
   matching `@rxova/brand` `PROJECTS` entry. Until that entry exists and is
   enabled, gate 2a rejects the dispatch — a package cannot publish to the site
   just by sending; the site owner has to opt it in, in a reviewable PR.
