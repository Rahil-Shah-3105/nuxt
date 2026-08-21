import type { UseScriptInput } from '@unhead/vue/scripts'
export const logger: NuxtLogger = useLogger('nuxt')
import { createError } from './error'

function renderStubMessage (name: string): void {
  const message = `\`${name}\` is provided by @nuxt/scripts. Check your console to install it or run 'npx nuxt module add @nuxt/scripts' to install it.`
NuxtLogger.debug(`renderStubMessage(name=${name}): message → ${message}`);
  if (import.meta.client) {
	NuxtLogger.debug(`>>> Entering renderStubMessage(name=${name})`);
	NuxtLogger.debug(`<<< Exiting renderStubMessage(name=${name})`);
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
NuxtLogger.debug(`>>> Entering useScriptTriggerElement(args=${args})`);
  renderStubMessage('useScriptTriggerElement')
NuxtLogger.debug(`<<< Exiting useScriptTriggerElement(args=${args})`);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useScriptTriggerConsent (...args: unknown[]): void {
NuxtLogger.debug(`>>> Entering useScriptTriggerConsent(args=${args})`);
  renderStubMessage('useScriptTriggerConsent')
NuxtLogger.debug(`<<< Exiting useScriptTriggerConsent(args=${args})`);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useScriptEventPage (...args: unknown[]): void {
NuxtLogger.debug(`>>> Entering useScriptEventPage(args=${args})`);
  renderStubMessage('useScriptEventPage')
NuxtLogger.debug(`<<< Exiting useScriptEventPage(args=${args})`);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useScriptGoogleAnalytics (...args: unknown[]): void {
NuxtLogger.debug(`>>> Entering useScriptGoogleAnalytics(args=${args})`);
  renderStubMessage('useScriptGoogleAnalytics')
NuxtLogger.debug(`<<< Exiting useScriptGoogleAnalytics(args=${args})`);
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useScriptPlausibleAnalytics (...args: unknown[]): void {
NuxtLogger.debug(`>>> Entering useScriptPlausibleAnalytics(args=${args})`);
  renderStubMessage('useScriptPlausibleAnalytics')
NuxtLogger.debug(`<<< Exiting useScriptPlausibleAnalytics(args=${args})`);
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useScriptCloudflareWebAnalytics (...args: unknown[]): void {
NuxtLogger.debug(`>>> Entering useScriptCloudflareWebAnalytics(args=${args})`);
  renderStubMessage('useScriptCloudflareWebAnalytics')
NuxtLogger.debug(`<<< Exiting useScriptCloudflareWebAnalytics(args=${args})`);
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useScriptCrisp (...args: unknown[]): void {
NuxtLogger.debug(`>>> Entering useScriptCrisp(args=${args})`);
  renderStubMessage('useScriptCrisp')
NuxtLogger.debug(`<<< Exiting useScriptCrisp(args=${args})`);
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useScriptFathomAnalytics (...args: unknown[]): void {
NuxtLogger.debug(`>>> Entering useScriptFathomAnalytics(args=${args})`);
  renderStubMessage('useScriptFathomAnalytics')
NuxtLogger.debug(`<<< Exiting useScriptFathomAnalytics(args=${args})`);
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useScriptMatomoAnalytics (...args: unknown[]): void {
NuxtLogger.debug(`>>> Entering useScriptMatomoAnalytics(args=${args})`);
  renderStubMessage('useScriptMatomoAnalytics')
NuxtLogger.debug(`<<< Exiting useScriptMatomoAnalytics(args=${args})`);
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useScriptGoogleTagManager (...args: unknown[]): void {
NuxtLogger.debug(`>>> Entering useScriptGoogleTagManager(args=${args})`);
  renderStubMessage('useScriptGoogleTagManager')
NuxtLogger.debug(`<<< Exiting useScriptGoogleTagManager(args=${args})`);
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useScriptSegment (...args: unknown[]): void {
NuxtLogger.debug(`>>> Entering useScriptSegment(args=${args})`);
  renderStubMessage('useScriptSegment')
NuxtLogger.debug(`<<< Exiting useScriptSegment(args=${args})`);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useScriptClarity (...args: unknown[]): void {
NuxtLogger.debug(`>>> Entering useScriptClarity(args=${args})`);
  renderStubMessage('useScriptClarity')
NuxtLogger.debug(`<<< Exiting useScriptClarity(args=${args})`);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useScriptMetaPixel (...args: unknown[]): void {
NuxtLogger.debug(`>>> Entering useScriptMetaPixel(args=${args})`);
  renderStubMessage('useScriptMetaPixel')
NuxtLogger.debug(`<<< Exiting useScriptMetaPixel(args=${args})`);
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useScriptXPixel (...args: unknown[]): void {
NuxtLogger.debug(`>>> Entering useScriptXPixel(args=${args})`);
  renderStubMessage('useScriptXPixel')
NuxtLogger.debug(`<<< Exiting useScriptXPixel(args=${args})`);
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useScriptIntercom (...args: unknown[]): void {
NuxtLogger.debug(`>>> Entering useScriptIntercom(args=${args})`);
  renderStubMessage('useScriptIntercom')
NuxtLogger.debug(`<<< Exiting useScriptIntercom(args=${args})`);
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useScriptHotjar (...args: unknown[]): void {
NuxtLogger.debug(`>>> Entering useScriptHotjar(args=${args})`);
  renderStubMessage('useScriptHotjar')
NuxtLogger.debug(`<<< Exiting useScriptHotjar(args=${args})`);
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useScriptStripe (...args: unknown[]): void {
NuxtLogger.debug(`>>> Entering useScriptStripe(args=${args})`);
  renderStubMessage('useScriptStripe')
NuxtLogger.debug(`<<< Exiting useScriptStripe(args=${args})`);
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useScriptLemonSqueezy (...args: unknown[]): void {
NuxtLogger.debug(`>>> Entering useScriptLemonSqueezy(args=${args})`);
  renderStubMessage('useScriptLemonSqueezy')
NuxtLogger.debug(`<<< Exiting useScriptLemonSqueezy(args=${args})`);
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useScriptVimeoPlayer (...args: unknown[]): void {
NuxtLogger.debug(`>>> Entering useScriptVimeoPlayer(args=${args})`);
  renderStubMessage('useScriptVimeoPlayer')
NuxtLogger.debug(`<<< Exiting useScriptVimeoPlayer(args=${args})`);
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useScriptGoogleMaps (...args: unknown[]): void {
NuxtLogger.debug(`>>> Entering useScriptGoogleMaps(args=${args})`);
  renderStubMessage('useScriptGoogleMaps')
NuxtLogger.debug(`<<< Exiting useScriptGoogleMaps(args=${args})`);
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useScriptNpm (...args: unknown[]): void {
NuxtLogger.debug(`>>> Entering useScriptNpm(args=${args})`);
  renderStubMessage('useScriptNpm')
NuxtLogger.debug(`<<< Exiting useScriptNpm(args=${args})`);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useScriptGoogleAdsense (...args: unknown[]): void {
NuxtLogger.debug(`>>> Entering useScriptGoogleAdsense(args=${args})`);
  renderStubMessage('useScriptGoogleAdsense')
NuxtLogger.debug(`<<< Exiting useScriptGoogleAdsense(args=${args})`);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useScriptYouTubePlayer (...args: unknown[]): void {
NuxtLogger.debug(`>>> Entering useScriptYouTubePlayer(args=${args})`);
  renderStubMessage('useScriptYouTubePlayer')
NuxtLogger.debug(`<<< Exiting useScriptYouTubePlayer(args=${args})`);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useScriptUmamiAnalytics (...args: unknown[]): void {
NuxtLogger.debug(`>>> Entering useScriptUmamiAnalytics(args=${args})`);
  renderStubMessage('useScriptUmamiAnalytics')
NuxtLogger.debug(`<<< Exiting useScriptUmamiAnalytics(args=${args})`);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useScriptSnapchatPixel (...args: unknown[]): void {
NuxtLogger.debug(`>>> Entering useScriptSnapchatPixel(args=${args})`);
  renderStubMessage('useScriptSnapchatPixel')
NuxtLogger.debug(`<<< Exiting useScriptSnapchatPixel(args=${args})`);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useScriptRybbitAnalytics (...args: unknown[]): void {
NuxtLogger.debug(`>>> Entering useScriptRybbitAnalytics(args=${args})`);
  renderStubMessage('useScriptRybbitAnalytics')
NuxtLogger.debug(`<<< Exiting useScriptRybbitAnalytics(args=${args})`);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useScriptDatabuddyAnalytics (...args: unknown[]): void {
NuxtLogger.debug(`>>> Entering useScriptDatabuddyAnalytics(args=${args})`);
  renderStubMessage('useScriptDatabuddyAnalytics')
NuxtLogger.debug(`<<< Exiting useScriptDatabuddyAnalytics(args=${args})`);
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useScriptRedditPixel (...args: unknown[]): void {
NuxtLogger.debug(`>>> Entering useScriptRedditPixel(args=${args})`);
  renderStubMessage('useScriptRedditPixel')
NuxtLogger.debug(`<<< Exiting useScriptRedditPixel(args=${args})`);
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useScriptPayPal (...args: unknown[]): void {
NuxtLogger.debug(`>>> Entering useScriptPayPal(args=${args})`);
  renderStubMessage('useScriptPayPal')
NuxtLogger.debug(`<<< Exiting useScriptPayPal(args=${args})`);
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useScriptVercelAnalytics (...args: unknown[]): void {
NuxtLogger.debug(`>>> Entering useScriptVercelAnalytics(args=${args})`);
  renderStubMessage('useScriptVercelAnalytics')
NuxtLogger.debug(`<<< Exiting useScriptVercelAnalytics(args=${args})`);
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useScriptPostHog (...args: unknown[]): void {
NuxtLogger.debug(`>>> Entering useScriptPostHog(args=${args})`);
  renderStubMessage('useScriptPostHog')
NuxtLogger.debug(`<<< Exiting useScriptPostHog(args=${args})`);
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useScriptMixpanelAnalytics (...args: unknown[]): void {
NuxtLogger.debug(`>>> Entering useScriptMixpanelAnalytics(args=${args})`);
  renderStubMessage('useScriptMixpanelAnalytics')
NuxtLogger.debug(`<<< Exiting useScriptMixpanelAnalytics(args=${args})`);
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useScriptBingUet (...args: unknown[]): void {
NuxtLogger.debug(`>>> Entering useScriptBingUet(args=${args})`);
  renderStubMessage('useScriptBingUet')
NuxtLogger.debug(`<<< Exiting useScriptBingUet(args=${args})`);
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useScriptTikTokPixel (...args: unknown[]): void {
NuxtLogger.debug(`>>> Entering useScriptTikTokPixel(args=${args})`);
  renderStubMessage('useScriptTikTokPixel')
NuxtLogger.debug(`<<< Exiting useScriptTikTokPixel(args=${args})`);
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useScriptGoogleRecaptcha (...args: unknown[]): void {
NuxtLogger.debug(`>>> Entering useScriptGoogleRecaptcha(args=${args})`);
  renderStubMessage('useScriptGoogleRecaptcha')
NuxtLogger.debug(`<<< Exiting useScriptGoogleRecaptcha(args=${args})`);
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useScriptGoogleSignIn (...args: unknown[]): void {
NuxtLogger.debug(`>>> Entering useScriptGoogleSignIn(args=${args})`);
  renderStubMessage('useScriptGoogleSignIn')
NuxtLogger.debug(`<<< Exiting useScriptGoogleSignIn(args=${args})`);
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useScriptGravatar (...args: unknown[]): void {
NuxtLogger.debug(`>>> Entering useScriptGravatar(args=${args})`);
  renderStubMessage('useScriptGravatar')
NuxtLogger.debug(`<<< Exiting useScriptGravatar(args=${args})`);
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useScriptAhrefsAnalytics (...args: unknown[]): void {
NuxtLogger.debug(`>>> Entering useScriptAhrefsAnalytics(args=${args})`);
  renderStubMessage('useScriptAhrefsAnalytics')
NuxtLogger.debug(`<<< Exiting useScriptAhrefsAnalytics(args=${args})`);
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useScriptLinkedInInsight (...args: unknown[]): void {
NuxtLogger.debug(`>>> Entering useScriptLinkedInInsight(args=${args})`);
  renderStubMessage('useScriptLinkedInInsight')
NuxtLogger.debug(`<<< Exiting useScriptLinkedInInsight(args=${args})`);
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useScriptCalendly (...args: unknown[]): void {
NuxtLogger.debug(`>>> Entering useScriptCalendly(args=${args})`);
  renderStubMessage('useScriptCalendly')
NuxtLogger.debug(`<<< Exiting useScriptCalendly(args=${args})`);
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useScriptUsercentrics (...args: unknown[]): void {
NuxtLogger.debug(`>>> Entering useScriptUsercentrics(args=${args})`);
  renderStubMessage('useScriptUsercentrics')
NuxtLogger.debug(`<<< Exiting useScriptUsercentrics(args=${args})`);
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function useScriptSpeedCurve (...args: unknown[]): void {
NuxtLogger.debug(`>>> Entering useScriptSpeedCurve(args=${args})`);
  renderStubMessage('useScriptSpeedCurve')
NuxtLogger.debug(`<<< Exiting useScriptSpeedCurve(args=${args})`);
}
