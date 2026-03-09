export type BuiltInPinKey =
  | 'landmark'
  | 'theatre_masks'
  | 'book'
  | 'utensils'
  | 'graduation_cap'
  | 'bed'
  | 'globe'
  | 'music'
  | 'sports'
  | 'default';

export const BUILT_IN_PIN_OPTIONS: Array<{ key: BuiltInPinKey; label: string; symbol: string }> = [
  { key: 'default', label: 'Default Pin', symbol: '📍' },
  { key: 'landmark', label: 'Landmark', symbol: '🏛️' },
  { key: 'theatre_masks', label: 'Performing Arts', symbol: '🎭' },
  { key: 'book', label: 'Library', symbol: '📚' },
  { key: 'utensils', label: 'Dining', symbol: '🍽️' },
  { key: 'graduation_cap', label: 'Academics', symbol: '🎓' },
  { key: 'bed', label: 'Residence Halls', symbol: '🛏️' },
  { key: 'globe', label: 'Study Abroad', symbol: '🌍' },
  { key: 'music', label: 'Music', symbol: '🎵' },
  { key: 'sports', label: 'Athletics', symbol: '🏅' },
];

const SYMBOL_BY_KEY = new Map(BUILT_IN_PIN_OPTIONS.map((option) => [option.key, option.symbol]));

export function getPinSymbol(iconKey: string | null | undefined): string {
  if (!iconKey) return '📍';
  return SYMBOL_BY_KEY.get(iconKey as BuiltInPinKey) ?? '📍';
}

export function getPinColor(pinColor: string | null | undefined, categoryColor: string | null | undefined): string {
  return pinColor || categoryColor || '#006b54';
}
