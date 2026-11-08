/// <reference path="../.astro/types.d.ts" />

declare namespace App {
  interface Locals {
    /** Set by the middleware on authenticated /admin requests. */
    user?: { id: number; email: string };
  }
}

// The original map script reads each district's name from a `title` attribute on its <path>.
declare namespace astroHTML.JSX {
  interface SVGAttributes {
    title?: string;
  }
}
