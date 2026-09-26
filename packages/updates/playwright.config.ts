import { astroPreview, e2eConfig } from '@rxova/repo-tooling/playwright'

export default e2eConfig({ command: astroPreview(4483), port: 4483 })
