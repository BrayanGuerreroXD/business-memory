import type { Ctx } from '../context'
import { notImplemented } from '../exit'

export function contextCommand(_ctx: Ctx): number {
  return notImplemented('context')
}
