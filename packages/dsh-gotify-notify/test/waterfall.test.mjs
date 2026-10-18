// Regression guard for the Cordis waterfall ordering rule this plugin depends on.
//
// `user-questions/request` and `approval/request` are waterfalls. A listener
// registered later sits further INSIDE the chain, so an earlier answerer that
// claims the request by returning an answer — the shipped web answerer does —
// stops the chain before a plain `ctx.on(...)` observer ever runs. Registering
// with `{ prepend: true }` puts the observer outermost; it then calls `next()`
// and the answerer still owns the decision.
//
// This package has no dependency on Cordis, so the guard resolves it from the
// active harness install and reports a skip when none is reachable.
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'

const REQUEST = { questions: [{ id: 'q1', question: 'proceed?' }] }

/** The shipped answerer: claims the request by answering without delegating. */
const shippedAnswerer = async () => ({ answers: [{ id: 'q1', selected: ['shipped'] }] })

/** Resolve the harness-provided Cordis from the active profile. */
async function loadCordis() {
  for (const root of [process.env.DSH_PROFILE_DIR, process.env.DSH_HOME]) {
    if (typeof root !== 'string' || root === '') continue
    try {
      const require = createRequire(`${root}/package.json`)
      const entry = require.resolve('@deepseek-ai/cordis')
      return await import(pathToFileURL(entry).href)
    } catch {
      // Try the next root.
    }
  }
  return undefined
}

const cordis = await loadCordis()
if (cordis === undefined) {
  console.log('waterfall guard: skipped — @deepseek-ai/cordis is not resolvable from DSH_PROFILE_DIR or DSH_HOME')
  process.exit(0)
}

const failures = []
const check = (condition, message) => {
  if (!condition) failures.push(message)
  console.log(`${condition ? 'ok  ' : 'FAIL'}  ${message}`)
}

/**
 * Register a claiming answerer, then an observer, and dispatch one request.
 * @param options - the observer's registration options.
 * @returns how many times the observer ran, and the answer that won.
 */
async function dispatch(options) {
  const root = new cordis.Context()
  let runs = 0
  root.on('user-questions/request', shippedAnswerer)
  root.on('user-questions/request', async (request, next) => {
    runs += 1
    return next()
  }, options)
  const answer = await root.waterfall('user-questions/request', REQUEST, () => ({ answers: [] }))
  await root.fiber.dispose()
  return { runs, answer }
}

const plain = await dispatch({})
check(plain.runs === 0, `a plain observer behind a claiming answerer never runs (ran ${plain.runs} time(s))`)
check(plain.answer.answers[0].selected[0] === 'shipped', 'the claiming answerer keeps the decision')

const prepended = await dispatch({ prepend: true })
check(prepended.runs === 1, `a prepended observer runs first (ran ${prepended.runs} time(s))`)
check(prepended.answer.answers[0].selected[0] === 'shipped', 'next() still delegates the decision to the answerer')

console.log(failures.length === 0 ? '\nwaterfall guard: all checks passed' : `\nwaterfall guard: ${failures.length} failure(s)`)
for (const failure of failures) console.log(`- ${failure}`)
process.exitCode = failures.length === 0 ? 0 : 1
