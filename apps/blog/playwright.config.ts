import { astroPreview, e2eConfig } from '@rxova/repo-tooling/playwright'

export default e2eConfig({ command: astroPreview(4482), port: 4482 })
