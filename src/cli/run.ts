import { parseArgv } from './args'
import { makeCtx } from './context'
import { CliError, EXIT } from './exit'
import type { Io } from './io'
import { COMMANDS } from './registry'
import { helpCommand } from './commands/help'
import { acceptedFlagNames, displayFlags, specFor, unknownFlagNames } from './spec'
import { didYouMean, renderError, type ErrorPayload } from '../render/error'
import { errEnvelope } from '../render/json'

export function run(io: Io): number {
  const args = parseArgv(io.argv)
  const ctx = makeCtx(io, args)

  const emit = (payload: ErrorPayload, exit: number): number => {
    if (ctx.json) io.stdout(errEnvelope(payload))
    else io.stderr(renderError(payload))
    return exit
  }

  try {
    if (args.command === null || args.command === 'help' || args.flags['help'] === true) {
      return helpCommand(ctx)
    }

    const handler = COMMANDS[args.command]
    if (handler === undefined) {
      const names = Object.keys(COMMANDS)
      const suggestion = didYouMean(args.command, names)
      const payload: ErrorPayload = {
        code: 'UNKNOWN_COMMAND',
        message: `unknown command '${args.command}'`,
        hint: `pm help  (valid: ${names.join(', ')})`,
      }
      if (suggestion !== null) payload['didYouMean'] = suggestion
      return emit(payload, EXIT.USAGE)
    }

    const spec = specFor(args.command)
    if (spec !== null) {
      const unknown = unknownFlagNames(spec, args.flags)
      const first = unknown[0]
      if (first !== undefined) {
        const valid = displayFlags(spec)
        const payload: ErrorPayload = {
          code: 'UNKNOWN_FLAG',
          message: `unknown flag '--${first}' for '${spec.name}' (valid: ${valid.join(', ')})`,
          validFlags: valid,
          hint: 'pm help --json',
        }
        const closest = didYouMean(first, acceptedFlagNames(spec))
        if (closest !== null) payload['didYouMean'] = `--${closest}`
        return emit(payload, EXIT.USAGE)
      }
    }

    return handler(ctx)
  } catch (err) {
    if (err instanceof CliError) {
      const payload: ErrorPayload = { code: err.code, message: err.message, ...err.payload }
      return emit(payload, err.exit)
    }
    return emit(
      { code: 'INTERNAL', message: (err as Error).message, hint: 'pm validate' },
      EXIT.USAGE,
    )
  }
}
