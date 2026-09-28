import { astroPreview, basePlaywrightConfig } from '@rxova/repo-config/playwright'

export default basePlaywrightConfig({
  command: astroPreview(4481),
  port: 4481,
  fullyParallel: true,
  workers: '50%',
})
