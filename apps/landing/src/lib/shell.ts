import type { ProjectId } from '@rxova/brand'
import { baseFor, type SourceKind } from '@rxova/website-schemas'

export interface ShellSource {
  id: string
  kind?: SourceKind
  enabled?: boolean
}

/** The path and project a shell template is built for, with the path derived like the deploy's mount. */
export function shellFor(source: ShellSource): { path: string; project: ProjectId | undefined } {
  const kind = source.kind ?? 'package'
  return {
    path: baseFor(source.id, kind),
    project: kind === 'package' ? (source.id as ProjectId) : undefined,
  }
}
