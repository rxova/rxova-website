/** The docs header on phones: one row, and one menu per page holding the links the desktop bar shows. */
import { expect, test, type Page } from "@playwright/test";

const SPLASH = "/";
const WITH_SIDEBAR = "/gallery/section/";

const menu = (page: Page) => page.locator("details.rx-menu");
const toggle = (page: Page) => page.locator(".rx-menu__toggle");

test.describe("on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("a splash page keeps the header to one row, with a menu button", async ({ page }) => {
    await page.goto(SPLASH);
    const header = await page.locator("header.header").boundingBox();
    expect(header?.height).toBeLessThanOrEqual(64);
    await expect(page.locator("header.header .rx-sections")).toBeHidden();
    await expect(toggle(page)).toBeVisible();
    await expect(toggle(page)).toHaveAccessibleName("Menu");
    await expect(toggle(page)).toHaveAttribute("aria-controls", "rx-menu-panel");
  });

  test("the splash menu holds the docs, the sections, GitHub, npm and the theme", async ({
    page,
  }) => {
    await page.goto(SPLASH);
    await toggle(page).click();
    await expect(menu(page)).toHaveAttribute("open", "");
    const panel = page.locator("#rx-menu-panel");
    await expect(panel.getByRole("list", { name: "Docs" }).getByRole("link")).toHaveText([
      "journey",
      "react-inputs",
      "use-everywhere",
      "ts-extended-errors",
      "overlock",
    ]);
    // The same items, in the same order, as the rxova.dev header.
    await expect(panel.getByRole("list", { name: "Site" }).getByRole("link")).toHaveText([
      "Projects",
      "Blog",
      "Updates",
    ]);
    await expect(panel.getByRole("link", { name: "GitHub" })).toBeVisible();
    await expect(panel.getByRole("link", { name: "npm" })).toBeVisible();
    await expect(panel.locator("starlight-theme-select select")).toBeVisible();
  });

  test("every control in the splash menu is at least 44px tall", async ({ page }) => {
    await page.goto(SPLASH);
    await toggle(page).click();
    const controls = page.locator("#rx-menu-panel").locator("a, select");
    for (const box of await controls.evaluateAll((els) =>
      els.map((el) => el.getBoundingClientRect().height),
    )) {
      expect(box).toBeGreaterThanOrEqual(44);
    }
    expect((await toggle(page).boundingBox())?.height).toBeGreaterThanOrEqual(44);
  });

  test("Esc closes the splash menu and returns focus to its button", async ({ page }) => {
    await page.goto(SPLASH);
    await toggle(page).focus();
    await page.keyboard.press("Enter");
    await expect(menu(page)).toHaveAttribute("open", "");
    await page.keyboard.press("Tab");
    await expect(page.locator("#rx-menu-panel a").first()).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(menu(page)).not.toHaveAttribute("open");
    await expect(toggle(page)).toBeFocused();
  });

  test("a click outside closes the splash menu", async ({ page }) => {
    await page.goto(SPLASH);
    await toggle(page).click();
    await expect(menu(page)).toHaveAttribute("open", "");
    await page.mouse.click(20, 700);
    await expect(menu(page)).not.toHaveAttribute("open");
  });

  test("a page with a sidebar gets the same links in Starlight's own menu, not a second menu", async ({
    page,
  }) => {
    await page.goto(WITH_SIDEBAR);
    await expect(menu(page)).toHaveCount(0);
    await page.locator("button[popovertarget='starlight__sidebar']").click();
    const pane = page.locator("#starlight__sidebar");
    await expect(pane.getByRole("list", { name: "Docs" }).getByRole("link")).toHaveCount(5);
    await expect(pane.getByRole("list", { name: "Site" }).getByRole("link")).toHaveText([
      "Projects",
      "Blog",
      "Updates",
    ]);
    await expect(pane.getByRole("link", { name: "GitHub" })).toBeVisible();
    await expect(pane.locator("starlight-theme-select select")).toBeVisible();
  });
});

test.describe("on a phone without JavaScript", () => {
  test.use({ viewport: { width: 390, height: 844 }, javaScriptEnabled: false });

  test("the splash menu still opens", async ({ page }) => {
    await page.goto(SPLASH);
    await toggle(page).click();
    await expect(page.locator("#rx-menu-panel").getByRole("link", { name: "Blog" })).toBeVisible();
  });
});

test.describe("on a desktop", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  for (const path of [SPLASH, WITH_SIDEBAR]) {
    test(`${path} shows the bar's own links and no menu button`, async ({ page }) => {
      await page.goto(path);
      await expect(toggle(page)).toBeHidden();
      await expect(page.locator(".sl-menu-button")).toBeHidden();
      const bar = page.locator("header.header .rx-sections");
      await expect(bar.locator(".rx-switcher__trigger")).toHaveText("Docs");
      await expect(bar.locator(".rx-sections__link")).toHaveText(["Projects", "Blog", "Updates"]);
    });
  }
});
