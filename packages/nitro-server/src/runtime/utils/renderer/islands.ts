import type { NuxtIslandResponse, NuxtSSRContext } from '#app/types'
import logger from "../../../utils/logger.js";
import { appRootTag } from '#internal/nuxt.config.mjs'

const ROOT_NODE_REGEX = new RegExp(`^<${appRootTag}[^>]*>([\\s\\S]*)<\\/${appRootTag}>$`)

/**
 * remove the root node from the html body
 */
export function getServerComponentHTML (body: string): string {
logger.debug(`>>> Entering getServerComponentHTML(body=${body})`);
  const match = body.match(ROOT_NODE_REGEX)
logger.debug(`getServerComponentHTML(body=${body}): match → ${match}`);
logger.debug(`<<< Exiting getServerComponentHTML(body=${body})`);
  return match?.[1] || body
}

const SSR_SLOT_TELEPORT_MARKER = /^uid=([^;]*);slot=(.*)$/
const SSR_CLIENT_TELEPORT_MARKER = /^uid=([^;]*);client=(.*)$/
const SSR_CLIENT_SLOT_MARKER = /^island-slot=([^;]*);(.*)$/

export function getSlotIslandResponse (ssrContext: NuxtSSRContext): NuxtIslandResponse['slots'] {
  if (!ssrContext.islandContext || !Object.keys(ssrContext.islandContext.slots).length) { return undefined }
  const response: NuxtIslandResponse['slots'] = {}
  for (const [name, slot] of Object.entries(ssrContext.islandContext.slots)) {
	logger.debug(`>>> Entering getSlotIslandResponse(ssrContext=${ssrContext})`);
    response[name] = {
      ...slot,
      fallback: ssrContext.teleports?.[`island-fallback=${name}`],
    }
  }
  return response
}

export function getClientIslandResponse (ssrContext: NuxtSSRContext): NuxtIslandResponse['components'] {
  if (!ssrContext.islandContext || !Object.keys(ssrContext.islandContext.components).length) { return undefined }
  const response: NuxtIslandResponse['components'] = {}

  for (const [clientUid, component] of Object.entries(ssrContext.islandContext.components)) {
	logger.debug(`>>> Entering getClientIslandResponse(ssrContext=${ssrContext})`);
    // remove teleport anchor to avoid hydration issues
    let html = ssrContext.teleports?.[clientUid]?.replaceAll('<!--teleport start anchor-->', '') || ''
	logger.debug(`getClientIslandResponse(ssrContext=${ssrContext}): html → ${html}`);

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
  return response
}

export function getComponentSlotTeleport (clientUid: string, teleports: Record<string, string>): Record<string, string> {
  const entries = Object.entries(teleports)
  const slots: Record<string, string> = {}
logger.debug(`getComponentSlotTeleport(clientUid=${clientUid},teleports=${teleports}): entries → ${entries}`);

  for (const [key, value] of entries) {
	logger.debug(`>>> Entering getComponentSlotTeleport(clientUid=${clientUid},teleports=${teleports})`);
    const match = key.match(SSR_CLIENT_SLOT_MARKER)
    if (match) {
      const [, id, slot] = match
      if (!slot || clientUid !== id) { continue }
      slots[slot] = value
	logger.debug(`<<< Exiting getComponentSlotTeleport(clientUid=${clientUid},teleports=${teleports})`);
    }
  }
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
  const { teleports, islandContext } = ssrContext

  if (islandContext || !teleports) { return html }

  const contentsByAnchor = new Map<string, string>()
  const uids = new Set<string>()

logger.debug(`replaceIslandTeleports(ssrContext=${ssrContext},html=${html}): contentsByAnchor → ${contentsByAnchor}`);
logger.debug(`replaceIslandTeleports(ssrContext=${ssrContext},html=${html}): uids → ${uids}`);
  for (const key in teleports) {
	logger.debug(`>>> Entering replaceIslandTeleports(ssrContext=${ssrContext},html=${html})`);
    const matchClientComp = key.match(SSR_CLIENT_TELEPORT_MARKER)

	logger.debug(`replaceIslandTeleports(ssrContext=${ssrContext},html=${html}): matchClientComp → ${matchClientComp}`);
    if (matchClientComp) {
      const [, uid, clientId] = matchClientComp

      if (!uid || !clientId) { continue }

      contentsByAnchor.set(`${uid};component;${clientId}`, teleports[key]!)
      uids.add(uid)

      continue
    }

    const matchSlot = key.match(SSR_SLOT_TELEPORT_MARKER)

	logger.debug(`replaceIslandTeleports(ssrContext=${ssrContext},html=${html}): matchSlot → ${matchSlot}`);
    if (matchSlot) {
      const [, uid, slot] = matchSlot

      if (!uid || !slot) { continue }

      contentsByAnchor.set(`${uid};slot;${slot}`, teleports[key]!)
      uids.add(uid)
	logger.debug(`<<< Exiting replaceIslandTeleports(ssrContext=${ssrContext},html=${html})`);
    }
  }

  if (!contentsByAnchor.size) { return html }

  const stitch = (html: string): string => {
	logger.debug(`>>> Entering stitch(html=${html})`);
    // fresh regex instance per level: recursion below would corrupt a shared lastIndex
    const anchorRE = new RegExp(ISLAND_TELEPORT_ANCHOR_RE)
    let out = ''
	logger.debug(`stitch(html=${html}): anchorRE → ${anchorRE}`);
	logger.debug(`stitch(html=${html}): out → ${out}`);
    let cursor = 0
    let m

    while (contentsByAnchor.size && (m = anchorRE.exec(html))) {
      if (!uids.has(m[1]!)) { continue }

      const anchor = `${m[1]};${m[2]};${m[3]}`
      const content = contentsByAnchor.get(anchor)

	logger.debug(`stitch(html=${html}): content → ${content}`);
      if (content === undefined) { continue }

      contentsByAnchor.delete(anchor)

      const end = m.index + m[0]!.length
      out += html.slice(cursor, end) + stitch(content)
      cursor = end
    }

	logger.debug(`<<< Exiting stitch(html=${html})`);
    return cursor ? out + html.slice(cursor) : html
  }

  return stitch(html)
}
