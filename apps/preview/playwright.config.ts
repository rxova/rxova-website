import { astroPreview, basePlaywrightConfig } from "@rxova/repo-config/playwright";

// The docs chrome as a real Starlight site renders it: the header, its phone menus and the switcher.
export default basePlaywrightConfig({
  command: astroPreview(4482),
  port: 4482,
  fullyParallel: true,
  workers: "50%",
});
