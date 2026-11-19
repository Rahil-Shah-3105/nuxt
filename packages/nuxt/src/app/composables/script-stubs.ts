import type { UseScriptInput } from '@unhead/vue/scripts'
export const logger: NuxtLogger = useLogger('nuxt')
import { createError } from './error'

function renderStubMessage (name: string): void {
NuxtLogger.error(`>>> Entering renderStubMessage(name=${name})`, { "event.action": "renderStubMessage", "logrite.name": name });
  const message = `\`${name}\` is provided by @nuxt/scripts. Check your console to install it or run 'npx nuxt module add @nuxt/scripts' to install it.`
  if (import.meta.client) {
	NuxtLogger.warn(`<<< Exiting renderStubMessage(name=${name})`, { "event.action": "renderStubMessage", "logrite.name": name });
    throw createError({
      fatal: true,
      status: 500,
      statusText: message,
    })
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useScript<T extends Record<string | symbol, any>> (input: UseScriptInput, options?: Record<string, unknown>): void {
  renderStubMessage('useScript')
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useScriptTriggerElement (...args: unknown[]): void {
NuxtLogger.error(`>>> Entering useScriptTriggerElement(args=${args})`, { "event.action": "useScriptTriggerElement" });
  renderStubMessage('useScriptTriggerElement')
NuxtLogger.warn(`<<< Exiting useScriptTriggerElement(args=${args})`, { "event.action": "useScriptTriggerElement" });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useScriptTriggerConsent (...args: unknown[]): void {
NuxtLogger.error(`>>> Entering useScriptTriggerConsent(args=${args})`, { "event.action": "useScriptTriggerConsent" });
  renderStubMessage('useScriptTriggerConsent')
NuxtLogger.warn(`<<< Exiting useScriptTriggerConsent(args=${args})`, { "event.action": "useScriptTriggerConsent" });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useScriptEventPage (...args: unknown[]): void {
NuxtLogger.error(`>>> Entering useScriptEventPage(args=${args})`, { "event.action": "useScriptEventPage" });
  renderStubMessage('useScriptEventPage')
NuxtLogger.warn(`<<< Exiting useScriptEventPage(args=${args})`, { "event.action": "useScriptEventPage" });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useScriptGoogleAnalytics (...args: unknown[]): void {
NuxtLogger.error(`>>> Entering useScriptGoogleAnalytics(args=${args})`, { "event.action": "useScriptGoogleAnalytics" });
  renderStubMessage('useScriptGoogleAnalytics')
NuxtLogger.warn(`<<< Exiting useScriptGoogleAnalytics(args=${args})`, { "event.action": "useScriptGoogleAnalytics" });
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useScriptPlausibleAnalytics (...args: unknown[]): void {
NuxtLogger.error(`>>> Entering useScriptPlausibleAnalytics(args=${args})`, { "event.action": "useScriptPlausibleAnalytics" });
  renderStubMessage('useScriptPlausibleAnalytics')
NuxtLogger.warn(`<<< Exiting useScriptPlausibleAnalytics(args=${args})`, { "event.action": "useScriptPlausibleAnalytics" });
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useScriptCloudflareWebAnalytics (...args: unknown[]): void {
NuxtLogger.error(`>>> Entering useScriptCloudflareWebAnalytics(args=${args})`, { "event.action": "useScriptCloudflareWebAnalytics" });
  renderStubMessage('useScriptCloudflareWebAnalytics')
NuxtLogger.warn(`<<< Exiting useScriptCloudflareWebAnalytics(args=${args})`, { "event.action": "useScriptCloudflareWebAnalytics" });
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useScriptCrisp (...args: unknown[]): void {
NuxtLogger.error(`>>> Entering useScriptCrisp(args=${args})`, { "event.action": "useScriptCrisp" });
  renderStubMessage('useScriptCrisp')
NuxtLogger.warn(`<<< Exiting useScriptCrisp(args=${args})`, { "event.action": "useScriptCrisp" });
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useScriptFathomAnalytics (...args: unknown[]): void {
NuxtLogger.error(`>>> Entering useScriptFathomAnalytics(args=${args})`, { "event.action": "useScriptFathomAnalytics" });
  renderStubMessage('useScriptFathomAnalytics')
NuxtLogger.warn(`<<< Exiting useScriptFathomAnalytics(args=${args})`, { "event.action": "useScriptFathomAnalytics" });
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useScriptMatomoAnalytics (...args: unknown[]): void {
NuxtLogger.error(`>>> Entering useScriptMatomoAnalytics(args=${args})`, { "event.action": "useScriptMatomoAnalytics" });
  renderStubMessage('useScriptMatomoAnalytics')
NuxtLogger.warn(`<<< Exiting useScriptMatomoAnalytics(args=${args})`, { "event.action": "useScriptMatomoAnalytics" });
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useScriptGoogleTagManager (...args: unknown[]): void {
NuxtLogger.error(`>>> Entering useScriptGoogleTagManager(args=${args})`, { "event.action": "useScriptGoogleTagManager" });
  renderStubMessage('useScriptGoogleTagManager')
NuxtLogger.warn(`<<< Exiting useScriptGoogleTagManager(args=${args})`, { "event.action": "useScriptGoogleTagManager" });
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useScriptSegment (...args: unknown[]): void {
NuxtLogger.error(`>>> Entering useScriptSegment(args=${args})`, { "event.action": "useScriptSegment" });
  renderStubMessage('useScriptSegment')
NuxtLogger.warn(`<<< Exiting useScriptSegment(args=${args})`, { "event.action": "useScriptSegment" });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useScriptClarity (...args: unknown[]): void {
NuxtLogger.error(`>>> Entering useScriptClarity(args=${args})`, { "event.action": "useScriptClarity" });
  renderStubMessage('useScriptClarity')
NuxtLogger.warn(`<<< Exiting useScriptClarity(args=${args})`, { "event.action": "useScriptClarity" });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useScriptMetaPixel (...args: unknown[]): void {
NuxtLogger.error(`>>> Entering useScriptMetaPixel(args=${args})`, { "event.action": "useScriptMetaPixel" });
  renderStubMessage('useScriptMetaPixel')
NuxtLogger.warn(`<<< Exiting useScriptMetaPixel(args=${args})`, { "event.action": "useScriptMetaPixel" });
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useScriptXPixel (...args: unknown[]): void {
NuxtLogger.error(`>>> Entering useScriptXPixel(args=${args})`, { "event.action": "useScriptXPixel" });
  renderStubMessage('useScriptXPixel')
NuxtLogger.warn(`<<< Exiting useScriptXPixel(args=${args})`, { "event.action": "useScriptXPixel" });
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useScriptIntercom (...args: unknown[]): void {
NuxtLogger.error(`>>> Entering useScriptIntercom(args=${args})`, { "event.action": "useScriptIntercom" });
  renderStubMessage('useScriptIntercom')
NuxtLogger.warn(`<<< Exiting useScriptIntercom(args=${args})`, { "event.action": "useScriptIntercom" });
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useScriptHotjar (...args: unknown[]): void {
NuxtLogger.error(`>>> Entering useScriptHotjar(args=${args})`, { "event.action": "useScriptHotjar" });
  renderStubMessage('useScriptHotjar')
NuxtLogger.warn(`<<< Exiting useScriptHotjar(args=${args})`, { "event.action": "useScriptHotjar" });
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useScriptStripe (...args: unknown[]): void {
NuxtLogger.error(`>>> Entering useScriptStripe(args=${args})`, { "event.action": "useScriptStripe" });
  renderStubMessage('useScriptStripe')
NuxtLogger.warn(`<<< Exiting useScriptStripe(args=${args})`, { "event.action": "useScriptStripe" });
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useScriptLemonSqueezy (...args: unknown[]): void {
NuxtLogger.error(`>>> Entering useScriptLemonSqueezy(args=${args})`, { "event.action": "useScriptLemonSqueezy" });
  renderStubMessage('useScriptLemonSqueezy')
NuxtLogger.warn(`<<< Exiting useScriptLemonSqueezy(args=${args})`, { "event.action": "useScriptLemonSqueezy" });
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useScriptVimeoPlayer (...args: unknown[]): void {
NuxtLogger.error(`>>> Entering useScriptVimeoPlayer(args=${args})`, { "event.action": "useScriptVimeoPlayer" });
  renderStubMessage('useScriptVimeoPlayer')
NuxtLogger.warn(`<<< Exiting useScriptVimeoPlayer(args=${args})`, { "event.action": "useScriptVimeoPlayer" });
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useScriptGoogleMaps (...args: unknown[]): void {
NuxtLogger.error(`>>> Entering useScriptGoogleMaps(args=${args})`, { "event.action": "useScriptGoogleMaps" });
  renderStubMessage('useScriptGoogleMaps')
NuxtLogger.warn(`<<< Exiting useScriptGoogleMaps(args=${args})`, { "event.action": "useScriptGoogleMaps" });
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useScriptNpm (...args: unknown[]): void {
NuxtLogger.error(`>>> Entering useScriptNpm(args=${args})`, { "event.action": "useScriptNpm" });
  renderStubMessage('useScriptNpm')
NuxtLogger.warn(`<<< Exiting useScriptNpm(args=${args})`, { "event.action": "useScriptNpm" });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useScriptGoogleAdsense (...args: unknown[]): void {
NuxtLogger.error(`>>> Entering useScriptGoogleAdsense(args=${args})`, { "event.action": "useScriptGoogleAdsense" });
  renderStubMessage('useScriptGoogleAdsense')
NuxtLogger.warn(`<<< Exiting useScriptGoogleAdsense(args=${args})`, { "event.action": "useScriptGoogleAdsense" });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useScriptYouTubePlayer (...args: unknown[]): void {
NuxtLogger.error(`>>> Entering useScriptYouTubePlayer(args=${args})`, { "event.action": "useScriptYouTubePlayer" });
  renderStubMessage('useScriptYouTubePlayer')
NuxtLogger.warn(`<<< Exiting useScriptYouTubePlayer(args=${args})`, { "event.action": "useScriptYouTubePlayer" });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useScriptUmamiAnalytics (...args: unknown[]): void {
NuxtLogger.error(`>>> Entering useScriptUmamiAnalytics(args=${args})`, { "event.action": "useScriptUmamiAnalytics" });
  renderStubMessage('useScriptUmamiAnalytics')
NuxtLogger.warn(`<<< Exiting useScriptUmamiAnalytics(args=${args})`, { "event.action": "useScriptUmamiAnalytics" });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useScriptSnapchatPixel (...args: unknown[]): void {
NuxtLogger.error(`>>> Entering useScriptSnapchatPixel(args=${args})`, { "event.action": "useScriptSnapchatPixel" });
  renderStubMessage('useScriptSnapchatPixel')
NuxtLogger.warn(`<<< Exiting useScriptSnapchatPixel(args=${args})`, { "event.action": "useScriptSnapchatPixel" });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useScriptRybbitAnalytics (...args: unknown[]): void {
NuxtLogger.error(`>>> Entering useScriptRybbitAnalytics(args=${args})`, { "event.action": "useScriptRybbitAnalytics" });
  renderStubMessage('useScriptRybbitAnalytics')
NuxtLogger.warn(`<<< Exiting useScriptRybbitAnalytics(args=${args})`, { "event.action": "useScriptRybbitAnalytics" });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useScriptDatabuddyAnalytics (...args: unknown[]): void {
NuxtLogger.error(`>>> Entering useScriptDatabuddyAnalytics(args=${args})`, { "event.action": "useScriptDatabuddyAnalytics" });
  renderStubMessage('useScriptDatabuddyAnalytics')
NuxtLogger.warn(`<<< Exiting useScriptDatabuddyAnalytics(args=${args})`, { "event.action": "useScriptDatabuddyAnalytics" });
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useScriptRedditPixel (...args: unknown[]): void {
NuxtLogger.error(`>>> Entering useScriptRedditPixel(args=${args})`, { "event.action": "useScriptRedditPixel" });
  renderStubMessage('useScriptRedditPixel')
NuxtLogger.warn(`<<< Exiting useScriptRedditPixel(args=${args})`, { "event.action": "useScriptRedditPixel" });
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useScriptPayPal (...args: unknown[]): void {
NuxtLogger.error(`>>> Entering useScriptPayPal(args=${args})`, { "event.action": "useScriptPayPal" });
  renderStubMessage('useScriptPayPal')
NuxtLogger.warn(`<<< Exiting useScriptPayPal(args=${args})`, { "event.action": "useScriptPayPal" });
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useScriptVercelAnalytics (...args: unknown[]): void {
NuxtLogger.error(`>>> Entering useScriptVercelAnalytics(args=${args})`, { "event.action": "useScriptVercelAnalytics" });
  renderStubMessage('useScriptVercelAnalytics')
NuxtLogger.warn(`<<< Exiting useScriptVercelAnalytics(args=${args})`, { "event.action": "useScriptVercelAnalytics" });
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useScriptPostHog (...args: unknown[]): void {
NuxtLogger.error(`>>> Entering useScriptPostHog(args=${args})`, { "event.action": "useScriptPostHog" });
  renderStubMessage('useScriptPostHog')
NuxtLogger.warn(`<<< Exiting useScriptPostHog(args=${args})`, { "event.action": "useScriptPostHog" });
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useScriptMixpanelAnalytics (...args: unknown[]): void {
NuxtLogger.error(`>>> Entering useScriptMixpanelAnalytics(args=${args})`, { "event.action": "useScriptMixpanelAnalytics" });
  renderStubMessage('useScriptMixpanelAnalytics')
NuxtLogger.warn(`<<< Exiting useScriptMixpanelAnalytics(args=${args})`, { "event.action": "useScriptMixpanelAnalytics" });
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useScriptBingUet (...args: unknown[]): void {
NuxtLogger.error(`>>> Entering useScriptBingUet(args=${args})`, { "event.action": "useScriptBingUet" });
  renderStubMessage('useScriptBingUet')
NuxtLogger.warn(`<<< Exiting useScriptBingUet(args=${args})`, { "event.action": "useScriptBingUet" });
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useScriptTikTokPixel (...args: unknown[]): void {
NuxtLogger.error(`>>> Entering useScriptTikTokPixel(args=${args})`, { "event.action": "useScriptTikTokPixel" });
  renderStubMessage('useScriptTikTokPixel')
NuxtLogger.warn(`<<< Exiting useScriptTikTokPixel(args=${args})`, { "event.action": "useScriptTikTokPixel" });
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useScriptGoogleRecaptcha (...args: unknown[]): void {
NuxtLogger.error(`>>> Entering useScriptGoogleRecaptcha(args=${args})`, { "event.action": "useScriptGoogleRecaptcha" });
  renderStubMessage('useScriptGoogleRecaptcha')
NuxtLogger.warn(`<<< Exiting useScriptGoogleRecaptcha(args=${args})`, { "event.action": "useScriptGoogleRecaptcha" });
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useScriptGoogleSignIn (...args: unknown[]): void {
NuxtLogger.error(`>>> Entering useScriptGoogleSignIn(args=${args})`, { "event.action": "useScriptGoogleSignIn" });
  renderStubMessage('useScriptGoogleSignIn')
NuxtLogger.warn(`<<< Exiting useScriptGoogleSignIn(args=${args})`, { "event.action": "useScriptGoogleSignIn" });
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useScriptGravatar (...args: unknown[]): void {
NuxtLogger.error(`>>> Entering useScriptGravatar(args=${args})`, { "event.action": "useScriptGravatar" });
  renderStubMessage('useScriptGravatar')
NuxtLogger.warn(`<<< Exiting useScriptGravatar(args=${args})`, { "event.action": "useScriptGravatar" });
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useScriptAhrefsAnalytics (...args: unknown[]): void {
NuxtLogger.error(`>>> Entering useScriptAhrefsAnalytics(args=${args})`, { "event.action": "useScriptAhrefsAnalytics" });
  renderStubMessage('useScriptAhrefsAnalytics')
NuxtLogger.warn(`<<< Exiting useScriptAhrefsAnalytics(args=${args})`, { "event.action": "useScriptAhrefsAnalytics" });
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useScriptLinkedInInsight (...args: unknown[]): void {
NuxtLogger.error(`>>> Entering useScriptLinkedInInsight(args=${args})`, { "event.action": "useScriptLinkedInInsight" });
  renderStubMessage('useScriptLinkedInInsight')
NuxtLogger.warn(`<<< Exiting useScriptLinkedInInsight(args=${args})`, { "event.action": "useScriptLinkedInInsight" });
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useScriptCalendly (...args: unknown[]): void {
NuxtLogger.error(`>>> Entering useScriptCalendly(args=${args})`, { "event.action": "useScriptCalendly" });
  renderStubMessage('useScriptCalendly')
NuxtLogger.warn(`<<< Exiting useScriptCalendly(args=${args})`, { "event.action": "useScriptCalendly" });
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useScriptUsercentrics (...args: unknown[]): void {
NuxtLogger.error(`>>> Entering useScriptUsercentrics(args=${args})`, { "event.action": "useScriptUsercentrics" });
  renderStubMessage('useScriptUsercentrics')
NuxtLogger.warn(`<<< Exiting useScriptUsercentrics(args=${args})`, { "event.action": "useScriptUsercentrics" });
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useScriptSpeedCurve (...args: unknown[]): void {
NuxtLogger.error(`>>> Entering useScriptSpeedCurve(args=${args})`, { "event.action": "useScriptSpeedCurve" });
  renderStubMessage('useScriptSpeedCurve')
NuxtLogger.warn(`<<< Exiting useScriptSpeedCurve(args=${args})`, { "event.action": "useScriptSpeedCurve" });
}
