// overlock: a green build that checks less.
//
// See ../ts-extended-errors/story.ts for how a story is put together.

import type { Showcase } from '../../lib/walkthrough'
import after from './after.txt?raw'
import before from './before.diff?raw'

export const story: Showcase = {
  heading: 'A green build that checks less',
  lede: 'A coding agent is asked to add a second discount code. Its change breaks two tests, and the patch it hands back passes CI by making the suite check less.',
  before: { label: "The agent's patch", code: before, lang: 'diff' },
  after: { label: 'npx overlock', code: after, lang: 'text' },
  notes: [
    {
      problem:
        '`it.skip` on the one test that says the discount comes before tax. The new code applies it after tax, and nothing fails.',
      fix: '`TEST_SKIPPED_ADDED`, graded high: the test no longer runs. The report quotes the line and says what to do.',
      lines: {
        before: [
          "it.skip('applies the discount before tax'",
          '+  const tax = Math.round(subtotal * taxRate)',
          '+  const discount = code ?',
        ],
        after: [
          'TEST_SKIPPED_ADDED',
          "it.skip('applies the discount before tax'",
          'Make the test pass, or delete it',
        ],
      },
    },
    {
      problem: 'An exact total becomes `toBeTruthy()`, which any returned object passes.',
      fix: '`ASSERTION_WEAKENED`: the assertion no longer names a value. Both versions of the line are quoted.',
      lines: {
        before: [
          'expect(invoiceTotal(lines, 0.2))',
          '-      subtotal: 4900,',
          '-      discount: 0,',
          '-      tax: 980,',
          '-      total: 5880,',
        ],
        after: [
          'ASSERTION_WEAKENED',
          'only checks that a value is truthy',
          'expect(invoiceTotal(lines, 0.2))',
        ],
      },
    },
    {
      problem:
        'The integration tests drop out of `include`. No test file changes, so a review of the tests alone misses it.',
      fix: '`SUITE_SCOPE_NARROWED` reads the runner config and names the pattern that was lost.',
      lines: {
        before: ["include: ['src/**/*.test.ts'"],
        after: [
          'SUITE_SCOPE_NARROWED',
          'lost 1 pattern: test/integration',
          "include: ['src/**/*.test.ts'",
        ],
      },
    },
    {
      problem: 'The coverage thresholds come down to what the smaller suite still reaches.',
      fix: '`COVERAGE_THRESHOLD_LOWERED`, once per threshold, with the old and new numbers. Any high finding fails the run.',
      lines: {
        before: ['lines: 90,', 'lines: 60,', 'branches: 85,', 'branches: 50,'],
        after: [
          'COVERAGE_THRESHOLD_LOWERED',
          'lowered from 90 to 60',
          'lowered from 85 to 50',
          '5 high',
        ],
      },
    },
  ],
}
