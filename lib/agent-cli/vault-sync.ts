import { fetchExport } from './api-client'
import { requireConfig, resolveVaultPath } from './config'
import { writeVaultFromData } from './vault-export'

export async function syncVaultMirror(): Promise<{
  vaultPath: string
  filesWritten: number
  exportedAt: string
}> {
  const config = requireConfig()
  const { data, exportedAt } = await fetchExport()
  const result = writeVaultFromData(data, resolveVaultPath(config))
  return {
    vaultPath: result.vaultPath,
    filesWritten: result.filesWritten,
    exportedAt,
  }
}
