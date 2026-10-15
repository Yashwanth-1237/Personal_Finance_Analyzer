import {
  BookOpen, Bus, Clapperboard, Home, MoreHorizontal, ShoppingBag, Tag, UtensilsCrossed,
} from 'lucide-react';

// Categorical palette in a fixed, colour-blind-checked order.
// A category keeps its colour everywhere (charts, badges) because the colour
// follows the category's position in the category list, never its spending rank.
export const SERIES_COLORS = [
  '#2a78d6', // blue
  '#eb6834', // orange
  '#1baf7a', // aqua
  '#eda100', // yellow
  '#e87ba4', // magenta
  '#008300', // green
  '#4a3aa7', // violet
  '#e34948', // red
];
export const FOLDED_COLOR = '#a8a7a1'; // 9th+ custom categories share a neutral grey

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
export function buildColorMap(categories) {
  const map = {};
  [...categories]
    .sort((a, b) => a.category_id - b.category_id)
    .forEach((c, index) => {
      map[c.category_id] = SERIES_COLORS[index] || FOLDED_COLOR;
    });
  return map;
}
