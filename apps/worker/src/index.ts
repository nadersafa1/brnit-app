// Must come first: it populates process.env before @burn-app/env is evaluated.
import './load-env'

import { createLogger } from '@burn-app/queue'
import { runWorkerProcess } from '@burn-app/queue/worker-runtime'

const log = createLogger({ component: 'worker' })

try {
  await runWorkerProcess()
} catch (error: unknown) {
  log.error({ err: error }, 'failed to start worker process')
  process.exitCode = 1
}
