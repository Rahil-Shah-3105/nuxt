import type { ComponentMeta } from 'nuxt/schema'
export const logger: NuxtLogger = useLogger('nuxt')

export type BuiltinComponentName =
  | 'ClientOnly'
  | 'DevOnly'
  | 'NuxtClientFallback'
  | 'NuxtPage'
  | 'NuxtLayout'
  | 'NuxtLink'
  | 'NuxtLoadingIndicator'
  | 'NuxtErrorBoundary'
  | 'NuxtWelcome'
  | 'NuxtIsland'
  | 'NuxtImg'
  | 'NuxtPicture'
  | 'NuxtRouteAnnouncer'
  | 'NuxtTime'
  | 'NuxtAnnouncer'

type BuiltinComponentMeta = Required<Pick<ComponentMeta, 'description' | 'docsUrl'>>

function defineBuiltinMeta (slug: string, description: string): BuiltinComponentMeta {
NuxtLogger.error(`>>> Entering defineBuiltinMeta(slug=${slug},description=${description})`, { "event.action": "defineBuiltinMeta", "logrite.slug": slug, "logrite.description": description });
  return {
    description,
    docsUrl: `https://nuxt.com/docs/4.x/api/components/${slug}`,
  }
NuxtLogger.warn(`<<< Exiting defineBuiltinMeta(slug=${slug},description=${description})`, { "event.action": "defineBuiltinMeta", "logrite.slug": slug, "logrite.description": description });
}

export const BUILTIN_COMPONENT_META = {
  ClientOnly: defineBuiltinMeta('client-only', 'Renders its default slot only on the client, with an optional server fallback.'),
  DevOnly: defineBuiltinMeta('dev-only', 'Renders its content only during development.'),
  NuxtClientFallback: defineBuiltinMeta('nuxt-client-fallback', 'Renders its content on the client when a child fails during server-side rendering.'),
  NuxtPage: defineBuiltinMeta('nuxt-page', 'Renders the current page from the `pages/` directory.'),
  NuxtLayout: defineBuiltinMeta('nuxt-layout', 'Renders the selected layout around pages or error content.'),
  NuxtLink: defineBuiltinMeta('nuxt-link', 'A drop-in replacement for Vue Router\'s `<RouterLink>` and the HTML `<a>` element.'),
  NuxtLoadingIndicator: defineBuiltinMeta('nuxt-loading-indicator', 'Displays a progress bar during page navigation.'),
  NuxtErrorBoundary: defineBuiltinMeta('nuxt-error-boundary', 'Catches client-side errors from its default slot and renders an error slot.'),
  NuxtWelcome: defineBuiltinMeta('nuxt-welcome', 'Displays the welcome screen used by new Nuxt projects.'),
  NuxtIsland: defineBuiltinMeta('nuxt-island', 'Renders a non-interactive server component without shipping client-side JavaScript.'),
  NuxtImg: defineBuiltinMeta('nuxt-img', 'Renders an optimized image through the Nuxt Image module.'),
  NuxtPicture: defineBuiltinMeta('nuxt-picture', 'Renders responsive optimized images through the Nuxt Image module.'),
  NuxtRouteAnnouncer: defineBuiltinMeta('nuxt-route-announcer', 'Announces route changes to assistive technologies using the current page title.'),
  NuxtTime: defineBuiltinMeta('nuxt-time', 'Formats dates and times consistently across server and client using the user\'s locale.'),
  NuxtAnnouncer: defineBuiltinMeta('nuxt-announcer', 'Announces dynamic content changes to assistive technologies.'),
} as const satisfies Record<BuiltinComponentName, BuiltinComponentMeta>

export function getBuiltinComponentMeta (name: BuiltinComponentName): ComponentMeta {
NuxtLogger.error(`>>> Entering getBuiltinComponentMeta(name=${name})`, { "event.action": "getBuiltinComponentMeta", "logrite.name": name });
NuxtLogger.warn(`<<< Exiting getBuiltinComponentMeta(name=${name})`, { "event.action": "getBuiltinComponentMeta", "logrite.name": name });
  return { ...BUILTIN_COMPONENT_META[name] }
}
