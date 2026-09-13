import type { Ctx } from './context'
import { initCommand } from './commands/init'
import { addCommand } from './commands/add'
import { updateCommand } from './commands/update'
import { showCommand } from './commands/show'
import { pathCommand } from './commands/path'
import { listCommand } from './commands/list'
import { searchCommand } from './commands/search'
import { contextCommand } from './commands/context'
import { validateCommand } from './commands/validate'
import { indexCommand } from './commands/index'
import { skillCommand } from './commands/skill'
import { helpCommand } from './commands/help'

export type CommandHandler = (ctx: Ctx) => number

export const COMMANDS: Record<string, CommandHandler> = {
  init: initCommand,
  add: addCommand,
  update: updateCommand,
  show: showCommand,
  path: pathCommand,
  list: listCommand,
  search: searchCommand,
  context: contextCommand,
  validate: validateCommand,
  index: indexCommand,
  skill: skillCommand,
  help: helpCommand,
}
