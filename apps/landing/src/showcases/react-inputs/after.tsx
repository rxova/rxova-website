import { useState } from 'react'
import { CurrencyInput } from '@rxova/react-intl-currency-input'
import { OtpInput } from '@rxova/react-otp-input'

type Props = {
  locale: string // the customer's, e.g. 'de-DE' or 'en-IE'
  send: (amount: number, code: string) => void
}

export function Transfer({ locale, send }: Props) {
  const [amount, setAmount] = useState<number | null>(null)
  const [code, setCode] = useState('')

  return (
    <form>
      <label htmlFor="amount">Amount</label>
      <CurrencyInput
        id="amount"
        locale={locale}
        currency="EUR"
        value={amount} // de-DE: typing 1250,50 shows '1.250,50 €'
        onChange={setAmount} // 1250.5, or null while the field is empty
      />

      <OtpInput
        length={6}
        value={code}
        onChange={setCode}
        onComplete={(final) => {
          if (amount !== null) send(amount, final)
        }}
        label="Code we sent you by SMS"
      />
    </form>
  )
}
