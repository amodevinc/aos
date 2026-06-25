/** Client-safe constants for CLI ↔ browser session bridge. */

export const SESSION_BRIDGE_PORT = 8766
export const SESSION_BRIDGE_URL = `http://127.0.0.1:${SESSION_BRIDGE_PORT}/session`

export const CLI_CALLBACK_PORT = 8765
export const CLI_CALLBACK_URL = `http://127.0.0.1:${CLI_CALLBACK_PORT}/callback`
