// react-inputs: a transfer form, filled in from berlin.
//
// See ../ts-extended-errors/story.ts for how a story is put together.

import type { Showcase } from '../../lib/walkthrough'
import after from './after.tsx?raw'
import before from './before.txt?raw'

export const story: Showcase = {
  heading: 'A transfer form, filled in from Berlin',
  lede: 'A customer sends money in euros and confirms it with the code her bank texts her. The amount has to read the way she writes numbers, and the code has to go in however her phone offers it.',
  before: { label: 'By hand', code: before, lang: 'tsx' },
  after: { label: 'With react-inputs', code: after, lang: 'tsx' },
  notes: [
    {
      problem:
        '`format` hard-codes a comma every three digits and a dot for decimals, and drops anything else. In Berlin, `1250,50` becomes `125,050`.',
      fix: "`CurrencyInput` takes the grouping, the decimal mark and the symbol's place from `Intl.NumberFormat` for the `locale` it is given: `1.250,50 €`.",
      lines: {
        before: [
          'function format(raw',
          "replace(/[^\\d.]/g, '')",
          '(\\d{3})',
          "'1250,50' in Berlin",
          '€ <input',
        ],
        after: [
          "the customer's, e.g.",
          'locale={locale}',
          'currency="EUR"',
          'de-DE: typing 1250,50',
        ],
      },
    },
    {
      problem:
        'Each keystroke replaces the value with a new string, so the caret jumps to the end. An empty field is sent as `0`.',
      fix: 'The caret stays where the customer put it while the value reformats. `onChange` gets a number, or `null` while the field is empty.',
      lines: {
        before: ['setText(next)', 'onAmount(Number(', 'useState(0)'],
        after: ['useState<number | null>(null)', 'onChange={setAmount}', 'if (amount !== null)'],
      },
    },
    {
      problem:
        'Each box holds one character. A pasted `482913`, or the code the phone offers from the SMS, lands in the first box as `4`.',
      fix: 'One real `<input>` sits under the six slots, so a paste fills all six, and `autocomplete="one-time-code"` is set for SMS autofill by default.',
      lines: {
        before: ['.slice(-1)', 'maxLength={1}'],
        after: ['<OtpInput', 'length={6}'],
      },
    },
    {
      problem:
        'Focus is moved by hand on every digit and on Backspace, and the six boxes have no name, so a screen reader reads out six unlabelled fields.',
      fix: 'Backspace, arrows and selection come from the platform. `label` names the one field, and `onComplete` fires once all six digits are in.',
      lines: {
        before: [
          'focus moved by hand',
          'boxes.current[i + 1]?.focus()',
          'const onKeyDown',
          'boxes.current[i - 1]?.focus()',
          '<p>Enter the code',
          'next.every(Boolean)',
        ],
        after: ['onComplete={(final)', 'label="Code we sent you by SMS"'],
      },
    },
  ],
}
