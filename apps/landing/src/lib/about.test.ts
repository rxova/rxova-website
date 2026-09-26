/**
 * The maintainer, standards and principles copy shared by the landing and /about.
 *
 * It is prose, so the checks are on what the pages build from it: ids that key
 * icons and anchors, links that must leave rxova.org, and copy that is present.
 */

import { describe, expect, it } from 'vitest'

import { MAINTAINER, PRINCIPLES, STANDARDS } from './about'

// Lowercase words joined by single hyphens: safe as a URL fragment and an HTML id.
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const isHttps = (href: string) => new URL(href).protocol === 'https:'

describe('MAINTAINER', () => {
  it('names the person and their role', () => {
    expect(MAINTAINER.name.trim()).not.toBe('')
    expect(MAINTAINER.role.trim()).not.toBe('')
    expect(MAINTAINER.summary.length).toBeGreaterThan(MAINTAINER.role.length)
  })

  it('links only to absolute https URLs, each marked external', () => {
    expect(MAINTAINER.links.length).toBeGreaterThan(0)
    for (const link of MAINTAINER.links) {
      expect(isHttps(link.href), link.href).toBe(true)
      expect(link.external).toBe(true)
      expect(link.label.trim()).not.toBe('')
    }
  })

  it('does not repeat a link label or target', () => {
    const labels = MAINTAINER.links.map((l) => l.label)
    const hrefs = MAINTAINER.links.map((l) => l.href)
    expect(new Set(labels).size).toBe(labels.length)
    expect(new Set(hrefs).size).toBe(hrefs.length)
  })

  it('points the org link at the GitHub organisation over https', () => {
    expect(isHttps(MAINTAINER.org)).toBe(true)
    expect(new URL(MAINTAINER.org).hostname).toBe('github.com')
  })

  it('gives a mail address a mailto: link can use', () => {
    expect(MAINTAINER.email).toMatch(/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/)
  })
})

describe('STANDARDS', () => {
  it('has unique, slug-shaped ids, since the landing keys an icon off each', () => {
    const ids = STANDARDS.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(id).toMatch(SLUG)
  })

  // The proposition comes first; everything after it constrains how it is met.
  it('leads with the one-pain-point standard', () => {
    expect(STANDARDS[0]?.id).toBe('one-pain-point')
  })

  it('pairs each short label with a longer sentence of detail', () => {
    for (const { label, detail } of STANDARDS) {
      expect(label, label).toMatch(/^[A-Z][^.]*$/)
      expect(detail, label).toMatch(/^[A-Za-z].*\.$/)
      expect(detail.length, label).toBeGreaterThan(label.length)
    }
  })
})

describe('PRINCIPLES', () => {
  it('has unique ids that are safe anchors on /about', () => {
    const ids = PRINCIPLES.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) {
      expect(id).toMatch(SLUG)
      expect(encodeURIComponent(id)).toBe(id)
    }
  })

  it('does not reuse a standard’s id, so the two lists cannot collide on a page', () => {
    const standards = new Set(STANDARDS.map((s) => s.id))
    for (const { id } of PRINCIPLES) expect(standards.has(id), id).toBe(false)
  })

  it('has a title, a summary and a longer detail for every principle', () => {
    for (const { id, title, summary, detail } of PRINCIPLES) {
      expect(title.trim(), id).not.toBe('')
      expect(summary, id).toMatch(/\.$/)
      expect(detail, id).toMatch(/\.$/)
      expect(detail.length, id).toBeGreaterThan(summary.length)
    }
  })

  it('has unique titles', () => {
    const titles = PRINCIPLES.map((p) => p.title)
    expect(new Set(titles).size).toBe(titles.length)
  })
})
