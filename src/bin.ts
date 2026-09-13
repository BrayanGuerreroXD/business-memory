#!/usr/bin/env node
import { realIo } from './cli/io'
import { run } from './cli/run'

process.exitCode = run(realIo())
