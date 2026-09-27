import SizeTable from '@rxova/astro-ui/components/SizeTable.astro'

import type { Meta, Story } from './types.ts'

const meta: Meta = {
  title: 'Landing/SizeTable',
  component: SizeTable,
  tags: ['autodocs'],
  args: {
    compression: 'brotli',
    caption:
      "Read from each package's size-limit configuration when this page was built. CI checks the same numbers on every commit.",
    rows: [
      { pkg: '@rxova/react-inputs', entry: 'everything', limitKb: 10 },
      { pkg: '@rxova/react-intl-currency-input', entry: 'CurrencyInput', limitKb: 3 },
      { pkg: '@rxova/react-otp-input', entry: 'OtpInput', limitKb: 3 },
      { pkg: '@rxova/react-rating-input', entry: 'Rating', limitKb: 2 },
      { pkg: '@rxova/react-phone-input', entry: 'PhoneInput', limitKb: 4 },
    ],
  },
}

export default meta

export const Budgets: Story = {}

export const OneRow: Story = {
  args: {
    compression: 'gzip',
    caption: 'A single package.',
    rows: [{ pkg: 'ts-extended-errors', entry: 'ExtendedError', limitKb: 2 }],
  },
}
