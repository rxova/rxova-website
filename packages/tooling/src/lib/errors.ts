/** The message of anything thrown: an Error's own message, or the value itself. */
export const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)
