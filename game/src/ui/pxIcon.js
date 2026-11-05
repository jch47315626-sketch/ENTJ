import { ICON_SPRITES } from '../data/iconSprites.js';

/**
 * Drawn pixel icons (game/assets/icons/, from tools/spirits/import.py "icon:"):
 * card_<upgrade id>, gear_<slot id>, ui_<name>. Returns an <img> for one that
 * exists, or `fallback` (the emoji it replaces) for one not drawn yet.
 */
export const hasIcon = (id) => !!ICON_SPRITES[id];
export const pxIcon = (id, fallback = '', cls = '') =>
  ICON_SPRITES[id] ? `<img class="px-icon${cls ? ` ${cls}` : ''}" src="assets/icons/${id}.png" alt="" draggable="false" decoding="async">` : fallback;
