export const EXIT = {
  OK: 0,
  USAGE: 2,
  NOT_FOUND: 3,
  NO_MEMORY: 4,
  INVALID: 5,
  CONFLICT: 6,
} as const

export class CliError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly exit: number,
    readonly payload: Record<string, unknown> = {},
  ) {
    super(message)
    this.name = 'CliError'
  }
}

export function notImplemented(command: string): never {
  throw new CliError('NOT_IMPLEMENTED', `command '${command}' is not implemented yet`, EXIT.USAGE)
}
