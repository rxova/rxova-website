/** A project panel: the name links to the docs, and the links come straight after the tagline. */
import { expect, test } from "@playwright/test";

const panel = (id: string) => `#project-${id}`;

test("the project name links to its docs, like the Docs link", async ({ page }) => {
  await page.goto("/projects/");
  const heading = page.locator(`${panel("ts-extended-errors")} .panel-title`);
  const docs = page
    .locator(panel("ts-extended-errors"))
    .getByRole("navigation", { name: "ts-extended-errors links" })
    .getByRole("link", { name: "Docs" });
  await expect(heading.getByRole("link", { name: "ts-extended-errors" })).toHaveAttribute(
    "href",
    (await docs.getAttribute("href")) ?? "",
  );
  // One link, not a link inside another control.
  await expect(heading.locator("a")).toHaveCount(1);
  await expect(heading.locator("a a, a button")).toHaveCount(0);
});

test("the links sit right after the tagline, before the blurb, install line and tags", async ({
  page,
}) => {
  await page.goto("/projects/");
  const order = await page
    .locator(panel("journey"))
    .evaluate((el) =>
      [...el.children].map((c) => c.getAttribute("class")?.split(" ")[0] ?? c.tagName),
    );
  expect(order.slice(0, 4)).toEqual(["panel-head", "links", "panel-blurb", "install"]);
  expect(order.indexOf("tags")).toBeGreaterThan(order.indexOf("install"));
});

test.describe("on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("scrolls the selected tab into the rail on load and on selection", async ({ page }) => {
    await page.goto("/projects/");
    const inRail = async (id: string) =>
      page.locator(`.rail-item[data-rail="${id}"]`).evaluate((tab) => {
        const rail = tab.parentElement?.getBoundingClientRect();
        const box = tab.getBoundingClientRect();
        return !!rail && box.left >= rail.left - 1 && box.right <= rail.right + 1;
      });
    await expect.poll(() => inRail("ts-extended-errors")).toBe(true);
    // The page itself stays where it was: only the rail scrolls.
    expect(await page.evaluate(() => window.scrollY)).toBe(0);

    await page.locator('.rail-item[data-rail="ts-extended-errors"]').focus();
    await page.keyboard.press("Home");
    await expect.poll(() => inRail("journey")).toBe(true);
    await page.keyboard.press("End");
    await expect.poll(() => inRail("ts-extended-errors")).toBe(true);
  });
});
