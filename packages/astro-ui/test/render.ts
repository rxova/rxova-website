/** Renders a component through the container API, stripped of what tests should not pin. */
import { experimental_AstroContainer as AstroContainer } from "astro/container";

type Component = Parameters<AstroContainer["renderToString"]>[0];
type Options = Parameters<AstroContainer["renderToString"]>[1];

/** Drops Astro's inline `<script>` elements, so assertions see only the markup. Not a sanitizer. */
const withoutScripts = (html: string): string => {
  const start = html.indexOf("<script");
  if (start === -1) return html;
  const end = html.indexOf("</script>", start) + "</script>".length;
  return withoutScripts(html.slice(0, start) + html.slice(end));
};

/** Rendered HTML without the scope attributes, which change with the file's path, or the scripts. */
export async function render(component: Component, options: Options = {}): Promise<string> {
  const container = await AstroContainer.create();
  const html = await container.renderToString(component, options);
  return withoutScripts(html.replace(/ data-astro-cid-[a-z0-9]+(="true")?/g, ""));
}
