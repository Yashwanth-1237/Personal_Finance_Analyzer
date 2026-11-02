import {
  BookOpen, Bus, Clapperboard, Home, MoreHorizontal, ShoppingBag, Tag, UtensilsCrossed,
} from 'lucide-react';

// Categorical palette in a fixed, colour-blind-checked order.
// A category keeps its colour everywhere (charts, badges) because the colour
// follows the category's position in the category list, never its spending rank.
export const SERIES_COLORS = [
  '#456dff', // cobalt
  '#c8f34a', // acid lime
  '#3dd6c6', // aqua
  '#ffc857', // amber
  '#ff7ca8', // pink
  '#8ee06b', // green
  '#a98bff', // violet
  '#ff6b73', // red
];
export const LIGHT_SERIES_COLORS = [
  '#345be8', // cobalt
  '#58750d', // lime
  '#087f76', // aqua
  '#9a6000', // amber
  '#bd416f', // pink
  '#477d18', // green
  '#6949c7', // violet
  '#c43440', // red
];
export const FOLDED_COLOR = '#8993a4'; // 9th+ custom categories share a neutral grey

const ICONS = {
  Food: UtensilsCrossed,
  Transportation: Bus,
  Shopping: ShoppingBag,
  Study: BookOpen,
  Entertainment: Clapperboard,
  Housing: Home,
  Other: MoreHorizontal,
};

export function iconFor(categoryName) {
  return ICONS[categoryName] || Tag;
}

/** Build a { category_id: color } map from the full category list (sorted by id). */
export function buildColorMap(categories, theme = 'dark') {
  const colors = theme === 'light' ? LIGHT_SERIES_COLORS : SERIES_COLORS;
  const map = {};
  [...categories]
    .sort((a, b) => a.category_id - b.category_id)
    .forEach((c, index) => {
      map[c.category_id] = colors[index] || FOLDED_COLOR;
    });
  return map;
}
