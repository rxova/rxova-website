/// <reference types="astro/client" />
// Astro's client types give an imported image its `ImageMetadata`, which `<Image>` props expect.

// Stylesheets are imported for their side effect; nothing reads a binding from them.
declare module '*.css'
