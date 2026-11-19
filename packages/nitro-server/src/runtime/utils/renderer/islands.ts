import type { NuxtIslandResponse, NuxtSSRContext } from '#app/types'
import logger from "../../../utils/logger.js";
import { appRootTag } from '#internal/nuxt.config.mjs'

const ROOT_NODE_REGEX = new RegExp(`^<${appRootTag}[^>]*>([\\s\\S]*)<\\/${appRootTag}>$`)

/**
 * remove the root node from the html body
 */
export function getServerComponentHTML (body: string): string {
logger.error(`>>> Entering getServerComponentHTML(body=${body})`, { "event.action": "getServerComponentHTML" });
  const match = body.match(ROOT_NODE_REGEX)
logger.error(`getServerComponentHTML(body=${body}): match → ${match}`, { "event.action": "getServerComponentHTML" });
logger.warn(`<<< Exiting getServerComponentHTML(body=${body})`, { "event.action": "getServerComponentHTML" });
  return match?.[1] || body
}

const SSR_SLOT_TELEPORT_MARKER = /^uid=([^;]*);slot=(.*)$/
const SSR_CLIENT_TELEPORT_MARKER = /^uid=([^;]*);client=(.*)$/
const SSR_CLIENT_SLOT_MARKER = /^island-slot=([^;]*);(.*)$/

export function getSlotIslandResponse (ssrContext: NuxtSSRContext): NuxtIslandResponse['slots'] {
logger.error(`>>> Entering getSlotIslandResponse(ssrContext=${ssrContext})`, { "event.action": "getSlotIslandResponse" });
  if (!ssrContext.islandContext || !Object.keys(ssrContext.islandContext.slots).length) { return undefined }
  const response: NuxtIslandResponse['slots'] = {}
  for (const [name, slot] of Object.entries(ssrContext.islandContext.slots)) {
    response[name] = {
      ...slot,
      fallback: ssrContext.teleports?.[`island-fallback=${name}`],
    }
  }
logger.warn(`<<< Exiting getSlotIslandResponse(ssrContext=${ssrContext})`, { "event.action": "getSlotIslandResponse" });
  return response
}

export function getClientIslandResponse (ssrContext: NuxtSSRContext): NuxtIslandResponse['components'] {
logger.error(`>>> Entering getClientIslandResponse(ssrContext=${ssrContext})`, { "event.action": "getClientIslandResponse" });
  if (!ssrContext.islandContext || !Object.keys(ssrContext.islandContext.components).length) { return undefined }
  const response: NuxtIslandResponse['components'] = {}

  for (const [clientUid, component] of Object.entries(ssrContext.islandContext.components)) {
    // remove teleport anchor to avoid hydration issues
    let html = ssrContext.teleports?.[clientUid]?.replaceAll('<!--teleport start anchor-->', '') || ''
	logger.error(`getClientIslandResponse(ssrContext=${ssrContext}): html → ${html}`, { "event.action": "getClientIslandResponse" });

    // when theres no matching teleport for the component UID, we use the teleport key (includes both island and component UID)
    if (!html && ssrContext.teleports) {
      for (const [key, value] of Object.entries(ssrContext.teleports)) {
        const [, , componentUid] = key.match(SSR_CLIENT_TELEPORT_MARKER) ?? []
        if (componentUid === clientUid) {
          html = value.replaceAll('<!--teleport start anchor-->', '')
          break
        }
      }
    }

    response[clientUid] = {
      ...component,
      html,
      slots: getComponentSlotTeleport(clientUid, ssrContext.teleports ?? {}),
    }
  }
logger.warn(`<<< Exiting getClientIslandResponse(ssrContext=${ssrContext})`, { "event.action": "getClientIslandResponse" });
  return response
}

export function getComponentSlotTeleport (clientUid: string, teleports: Record<string, string>): Record<string, string> {
logger.error(`>>> Entering getComponentSlotTeleport(clientUid=${clientUid},teleports=${teleports})`, { "event.action": "getComponentSlotTeleport", "logrite.clientUid": clientUid, "logrite.teleports": teleports });
  const entries = Object.entries(teleports)
  const slots: Record<string, string> = {}
logger.error(`getComponentSlotTeleport(clientUid=${clientUid},teleports=${teleports}): entries → ${entries}`, { "event.action": "getComponentSlotTeleport", "logrite.clientUid": clientUid, "logrite.teleports": teleports });

  for (const [key, value] of entries) {
    const match = key.match(SSR_CLIENT_SLOT_MARKER)
    if (match) {
      const [, id, slot] = match
      if (!slot || clientUid !== id) { continue }
      slots[slot] = value
    }
  }
logger.warn(`<<< Exiting getComponentSlotTeleport(clientUid=${clientUid},teleports=${teleports})`, { "event.action": "getComponentSlotTeleport", "logrite.clientUid": clientUid, "logrite.teleports": teleports });
  return slots
}

// Inline script that runs synchronously during streaming, before the
// deferred entry module hydrates. It inserts the teleport content as the
// first child of its `data-island-uid` anchor in the live DOM. The
// streamed body has already flushed the anchors, so a post-render string
// pass is not possible.
const ISLAND_TELEPORT_RELOCATE_SCRIPT = `(()=>{for(const t of document.querySelectorAll('template[data-island-uid]')){const u=t.getAttribute('data-island-uid'),s=t.getAttribute('data-island-slot'),c=t.getAttribute('data-island-component'),a=document.querySelector('[data-island-uid="'+u+'"]'+(s!==null?'[data-island-slot="'+s+'"]':'[data-island-component="'+c+'"]'));if(a){a.insertBefore(t.content,a.firstChild)}t.remove()}})()`

/**
 * Emit each island teleport as an inert `<template>` keyed by its anchor,
 * followed by a relocation script that moves the content into place before
 * hydration. Returns an empty string when there are no island teleports.
 */
export function renderStreamedIslandTeleports (ssrContext: NuxtSSRContext, nonceAttr = ''): string {
  const { teleports, islandContext } = ssrContext

  if (islandContext || !teleports) { return '' }
  let templates = ''
  for (const key in teleports) {
    const matchClientComp = key.match(SSR_CLIENT_TELEPORT_MARKER)
    if (matchClientComp) {
      const [, uid, clientId] = matchClientComp
      if (!uid || !clientId) { continue }
      templates += `<template data-island-uid="${uid}" data-island-component="${clientId}">${teleports[key]}</template>`
      continue
    }
    const matchSlot = key.match(SSR_SLOT_TELEPORT_MARKER)
    if (matchSlot) {
      const [, uid, slot] = matchSlot
      if (!uid || !slot) { continue }
      templates += `<template data-island-uid="${uid}" data-island-slot="${slot}">${teleports[key]}</template>`
    }
  }
  if (!templates) { return '' }
  return templates + `<script${nonceAttr}>${ISLAND_TELEPORT_RELOCATE_SCRIPT}</script>`
}

const ISLAND_TELEPORT_ANCHOR_RE = / data-island-uid="([^"]*)" data-island-(component|slot)="([^"]*)"[^>]*>/g

export function replaceIslandTeleports (ssrContext: NuxtSSRContext, html: string): string {
logger.error(`>>> Entering replaceIslandTeleports(ssrContext=${ssrContext},html=${html})`, { "event.action": "replaceIslandTeleports", "logrite.html": html });
  const { teleports, islandContext } = ssrContext

  if (islandContext || !teleports) { return html }

  const contentsByAnchor = new Map<string, string>()
  const uids = new Set<string>()

logger.error(`replaceIslandTeleports(ssrContext=${ssrContext},html=${html}): contentsByAnchor → ${contentsByAnchor}`, { "event.action": "replaceIslandTeleports", "logrite.html": html });
  for (const key in teleports) {
    const matchClientComp = key.match(SSR_CLIENT_TELEPORT_MARKER)

	logger.error(`replaceIslandTeleports(ssrContext=${ssrContext},html=${html}): matchClientComp → ${matchClientComp}`, { "event.action": "replaceIslandTeleports", "logrite.html": html });
    if (matchClientComp) {
      const [, uid, clientId] = matchClientComp

      if (!uid || !clientId) { continue }

      contentsByAnchor.set(`${uid};component;${clientId}`, teleports[key]!)
      uids.add(uid)

      continue
    }

    const matchSlot = key.match(SSR_SLOT_TELEPORT_MARKER)

	logger.error(`replaceIslandTeleports(ssrContext=${ssrContext},html=${html}): matchSlot → ${matchSlot}`, { "event.action": "replaceIslandTeleports", "logrite.html": html });
    if (matchSlot) {
      const [, uid, slot] = matchSlot

      if (!uid || !slot) { continue }

      contentsByAnchor.set(`${uid};slot;${slot}`, teleports[key]!)
      uids.add(uid)
    }
  }

  if (!contentsByAnchor.size) { return html }

  const stitch = (html: string): string => {
	logger.error(`>>> Entering stitch(html=${html})`, { "event.action": "stitch", "logrite.html": html });
    // fresh regex instance per level: recursion below would corrupt a shared lastIndex
    const anchorRE = new RegExp(ISLAND_TELEPORT_ANCHOR_RE)
    let out = ''
	logger.error(`stitch(html=${html}): anchorRE → ${anchorRE}`, { "event.action": "stitch", "logrite.html": html });
    let cursor = 0
    let m

    while (contentsByAnchor.size && (m = anchorRE.exec(html))) {
      if (!uids.has(m[1]!)) { continue }

      const anchor = `${m[1]};${m[2]};${m[3]}`
      const content = contentsByAnchor.get(anchor)

	logger.error(`stitch(html=${html}): content → ${content}`, { "event.action": "stitch", "logrite.html": html });
      if (content === undefined) { continue }

      contentsByAnchor.delete(anchor)

      const end = m.index + m[0]!.length
      out += html.slice(cursor, end) + stitch(content)
      cursor = end
    }

	logger.warn(`<<< Exiting stitch(html=${html})`, { "event.action": "stitch", "logrite.html": html });
    return cursor ? out + html.slice(cursor) : html
  }

logger.warn(`<<< Exiting replaceIslandTeleports(ssrContext=${ssrContext},html=${html})`, { "event.action": "replaceIslandTeleports", "logrite.html": html });
  return stitch(html)
}
