/**
 * Emoji Resolver
 * 
 * Strategy interface for resolving emojis from category names.
 */

import type { EmojiResolver } from '../types';

/**
 * Word-matching emoji resolver.
 * Extracted from current products.ts with improvements.
 */
export class WordMatchEmojiResolver implements EmojiResolver {
  private readonly iconMap: Record<string, string>;

  constructor(customMap?: Record<string, string>) {
    // Default word-to-emoji mapping from current products.ts
    this.iconMap = customMap ?? {
      fruit: '🍎',
      apple: '🍎',
      veg: '🥦',
      vegetable: '🥦',
      produce: '🥦',
      bakery: '🥐',
      bread: '🥐',
      cake: '🎂',
      baking: '🧁',
      dairy: '🥛',
      milk: '🥛',
      cheese: '🧀',
      egg: '🥚',
      eggs: '🥚',
      drink: '🥤',
      beverage: '🥤',
      juice: '🧃',
      water: '💧',
      beverages: '🥤',
      clean: '🧹',
      cleaning: '🧼',
      household: '🏠',
      pharma: '💊',
      medicine: '💊',
      health: '❤️',
      personal: '🧴',
      care: '🧴',
      pet: '🐶',
      animal: '🐱',
      pest: '🐀',
      toy: '🧸',
      game: '🎮',
      baby: '👶',
      snack: '🍿',
      chip: '🍪',
      biscuit: '🍪',
      cookies: '🍪',
      chocolates: '🍫',
      candies: '🍬',
      ice: '🍦',
      cream: '🍦',
      packaged: '🥡',
      food: '🍽️',
      rice: '🍚',
      grain: '🌾',
      flour: '🌾',
      oil: '🛢️',
      spice: '🌶️',
      masala: '🌶️',
      condiment: '🥫',
      cooking: '🍳',
      meat: '🍗',
      chicken: '🐔',
      fish: '🐟',
      beef: '🥩',
      frozen: '🧊',
      electronics: '🔌',
      mobile: '📱',
      tea: '☕',
      coffee: '☕',
      cereal: '🥣',
      breakfast: '🍳',
    };
  }

  resolve(categoryName: string, dbEmoji?: string | null): string {
    // First, trust the database if it's valid
    if (dbEmoji && dbEmoji.trim() && dbEmoji !== '📦') {
      return dbEmoji;
    }

    // Fall back to word matching
    const words = categoryName.toLowerCase().trim().split(/\s+/);
    for (const word of words) {
      if (this.iconMap[word]) {
        return this.iconMap[word];
      }
    }

    // Default fallback
    return '📦';
  }
}

