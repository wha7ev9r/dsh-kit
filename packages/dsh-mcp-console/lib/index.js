/**
 * Host half of the MCP console bundle.
 *
 * The browser panel and the model-facing tools share the Loader's MCP client
 * rows. The package does not own MCP server configuration; it only observes
 * and updates those rows through the normal DSH Loader API.
 */
const MCP_CLIENT = '@deepseek-ai/dsh-mcp-client'
const PATH = '/api/mcp-console'
const STATE_NAMES = ['pending', 'loading', 'active', 'failed', 'disposed', 'unloading']

export const inject = ['loader', 'tools']

function listServers(loader) {
  const servers = []
  for (const entry of loader.entries()) {
    const options = entry.options
    if (!options || options.name !== MCP_CLIENT) continue
    const config = options.config || {}
    const fiber = entry.fiber
    servers.push({
      id: options.id,
      serverName: config.serverName || '',
      transport: config.transport || '',
      url: config.url || '',
      disabled: options.disabled === true,
      state: fiber ? (STATE_NAMES[fiber.state] || 'unknown') : 'disabled',
    })
  }
  return servers
}

function summarize(servers) {
  if (!servers.length) return '(no MCP server rows)'
  return servers.map((server) => {
    const status = server.disabled
      ? 'disabled'
      : server.state === 'active'
        ? 'running'
        : server.state === 'failed'
          ? 'failed'
          : 'starting'
    return `- ${server.id} [${server.serverName}] ${server.transport} ${status}`
  }).join('\n')
}

function fail(message) {
  return { ok: false, error: { code: 'internal', message, details: {} } }
}

function envelope(rpcId, result) {
  return Response.json({ type: 'server-response', rpcId, result })
}

export function apply(ctx) {
  const { loader, tools } = ctx

  // Connection's shared /api handler applies its Host/Origin and browser
  // authentication policy before an exact fetch route is dispatched. The
  // Client half therefore uses the authenticated channel rather than a
  // second unauthenticated HTTP server.
  ctx.inject(['connection'], (connectionCtx) => {
    connectionCtx.effect(() => connectionCtx.connection.fetch.register({
      path: PATH,
      methods: ['POST'],
      requestBody: 'buffered',
      async fetch(request) {
        let body
        try {
          body = await request.json()
        } catch {
          return new Response('body is not JSON', { status: 400 })
        }

        const rpcId = typeof body?.rpcId === 'string' ? body.rpcId : 'invalid-request'
        const call = body?.payload ?? {}
        try {
          if (call.endpoint === 'list') {
            return envelope(rpcId, { ok: true, value: { servers: listServers(loader) } })
          }
          if (call.endpoint === 'toggle') {
            const args = call.payload
            if (!args || typeof args.id !== 'string' || typeof args.disabled !== 'boolean') {
              return envelope(rpcId, fail('toggle: id and disabled are required'))
            }
            await loader.update(args.id, { disabled: args.disabled })
            return envelope(rpcId, { ok: true, value: { servers: listServers(loader) } })
          }
          return envelope(rpcId, fail(`unknown endpoint: ${String(call.endpoint)}`))
        } catch (error) {
          return envelope(rpcId, fail(error?.message ? error.message : String(error)))
        }
      },
    }), '@wha7ever/dsh-mcp-console: /api/mcp-console')
  })

  ctx.effect(() => tools.register({
    name: 'mcp_status',
    description: 'Show the enabled/disabled and runtime state of every MCP server row.',
    parameters: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
    output: {
      schema: { type: 'string' },
      render(_args, value) {
        return [{ type: 'text', text: value }]
      },
    },
    async execute() {
      return summarize(listServers(loader))
    },
  }), '@wha7ever/dsh-mcp-console: mcp_status')

  ctx.effect(() => tools.register({
    name: 'mcp_toggle',
    description: 'Enable or disable one MCP server row by its Loader id; the change is persisted by DSH.',
    parameters: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'MCP server row id, for example mcp-github' },
        disabled: { type: 'boolean', description: 'true disables the row; false enables it' },
      },
      required: ['id', 'disabled'],
      additionalProperties: false,
    },
    output: {
      schema: { type: 'string' },
      render(_args, value) {
        return [{ type: 'text', text: value }]
      },
    },
    async execute(args) {
      await loader.update(args.id, { disabled: args.disabled })
      return summarize(listServers(loader))
    },
  }), '@wha7ever/dsh-mcp-console: mcp_toggle')
}
