import { HashPower, PowerUnit } from '../types';

// Hash power unit multipliers (each unit is 1000x the previous)
const UNIT_MULTIPLIERS: Record<PowerUnit, number> = {
  'H': 1,
  'Kh': 1e3,
  'Mh': 1e6,
  'Gh': 1e9,
  'Th': 1e12,
  'Ph': 1e15,
  'Eh': 1e18,
  'Zh': 1e21,
  'Yh': 1e24,
};

const UNIT_ORDER: PowerUnit[] = ['H', 'Kh', 'Mh', 'Gh', 'Th', 'Ph', 'Eh', 'Zh', 'Yh'];

/**
 * Parse a hash power string like "11.322 Eh/s" or "3.932 Zh/s"
 * @param powerString - The power string to parse
 * @returns HashPower object with value and unit, or null if parsing fails
 */
export function parseHashPower(powerString: string): HashPower | null {
  if (!powerString) return null;

  // Clean up the string
  const cleaned = powerString.trim().replace('/s', '').replace(/\s+/g, ' ');
  
  // Match pattern like "11.322 Eh" or "881.997 Eh"
  const match = cleaned.match(/^([\d.,]+)\s*([A-Za-z]+)$/);
  
  if (!match) return null;

  const valueStr = match[1].replace(',', '.');
  const value = parseFloat(valueStr);
  const unitRaw = match[2];

  // Normalize unit (capitalize first letter, lowercase rest)
  const unit = normalizeUnit(unitRaw);

  if (isNaN(value) || !unit) return null;

  return { value, unit };
}

/**
 * Normalize unit string to standard format
 */
function normalizeUnit(unitRaw: string): PowerUnit | null {
  const normalized = unitRaw.charAt(0).toUpperCase() + unitRaw.slice(1).toLowerCase();
  
  // Handle special case for single 'H'
  if (unitRaw.toLowerCase() === 'h') return 'H';
  
  // Remove trailing 'h' if present and add it back properly
  const withoutH = normalized.replace(/h$/i, '');
  const finalUnit = withoutH + 'h';
  
  if (UNIT_ORDER.includes(finalUnit as PowerUnit)) {
    return finalUnit as PowerUnit;
  }
  
  // Try direct match
  if (UNIT_ORDER.includes(normalized as PowerUnit)) {
    return normalized as PowerUnit;
  }

  return null;
}

/**
 * Convert hash power to base unit (H/s)
 */
export function toBaseUnit(power: HashPower): number {
  return power.value * UNIT_MULTIPLIERS[power.unit];
}

/**
 * Convert base unit (H/s) to a specific power unit
 */
export function fromBaseUnit(baseValue: number, targetUnit: PowerUnit): HashPower {
  return {
    value: baseValue / UNIT_MULTIPLIERS[targetUnit],
    unit: targetUnit,
  };
}

/**
 * Convert between power units
 */
export function convertPower(power: HashPower, targetUnit: PowerUnit): HashPower {
  const baseValue = toBaseUnit(power);
  return fromBaseUnit(baseValue, targetUnit);
}

/**
 * Format hash power for display
 */
export function formatHashPower(power: HashPower): string {
  const formatted = power.value.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
  return `${formatted} ${power.unit}/s`;
}

/**
 * Find the best unit for displaying a value (auto-scale)
 */
export function autoScalePower(baseValue: number): HashPower {
  let bestUnit: PowerUnit = 'H';
  
  for (const unit of UNIT_ORDER) {
    const converted = baseValue / UNIT_MULTIPLIERS[unit];
    if (converted >= 1 && converted < 1000) {
      bestUnit = unit;
      break;
    }
    if (converted >= 1) {
      bestUnit = unit;
    }
  }

  return fromBaseUnit(baseValue, bestUnit);
}

/**
 * Compare two hash powers
 * @returns negative if a < b, positive if a > b, 0 if equal
 */
export function comparePower(a: HashPower, b: HashPower): number {
  return toBaseUnit(a) - toBaseUnit(b);
}

/**
 * Calculate power ratio (a / b)
 */
export function powerRatio(userPower: HashPower, leaguePower: HashPower): number {
  const userBase = toBaseUnit(userPower);
  const leagueBase = toBaseUnit(leaguePower);
  
  if (leagueBase === 0) return 0;
  
  return userBase / leagueBase;
}
