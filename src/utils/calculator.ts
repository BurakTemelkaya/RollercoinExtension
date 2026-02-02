import { CoinEarnings, EarningsData, MiningData, Period } from '../types';
import { powerRatio } from './powerParser';

// Block time in minutes (Rollercoin standard)
const BLOCK_TIME_MINUTES = 10;

// Blocks per period
const BLOCKS_PER_PERIOD: Record<Period, number> = {
  hourly: 60 / BLOCK_TIME_MINUTES,           // 6 blocks
  daily: (60 / BLOCK_TIME_MINUTES) * 24,     // 144 blocks
  weekly: (60 / BLOCK_TIME_MINUTES) * 24 * 7, // 1008 blocks
  monthly: (60 / BLOCK_TIME_MINUTES) * 24 * 30, // 4320 blocks
};

// Game tokens that don't have market prices
export const GAME_TOKENS = ['RLT', 'RST', 'HMT'];

/**
 * Check if a currency is a game token
 */
export function isGameToken(currency: string): boolean {
  return GAME_TOKENS.includes(currency.toUpperCase());
}

/**
 * Calculate earnings for a single coin
 */
export function calculateCoinEarnings(
  miningData: MiningData,
  prices: Record<string, number> = {}
): CoinEarnings {
  const { currency, userPower, leaguePower, blockReward } = miningData;
  
  // Calculate power share ratio
  const share = powerRatio(userPower, leaguePower);
  
  // Calculate reward per block
  const rewardPerBlock = blockReward * share;
  
  // Calculate earnings for each period
  const earnings: EarningsData = {
    perBlock: rewardPerBlock,
    hourly: rewardPerBlock * BLOCKS_PER_PERIOD.hourly,
    daily: rewardPerBlock * BLOCKS_PER_PERIOD.daily,
    weekly: rewardPerBlock * BLOCKS_PER_PERIOD.weekly,
    monthly: rewardPerBlock * BLOCKS_PER_PERIOD.monthly,
  };

  // Get price if available (for crypto tokens)
  const price = isGameToken(currency) ? undefined : prices[currency.toUpperCase()];
  
  // Calculate fiat values if price is available
  const fiatValues: EarningsData | undefined = price ? {
    perBlock: earnings.perBlock * price,
    hourly: earnings.hourly * price,
    daily: earnings.daily * price,
    weekly: earnings.weekly * price,
    monthly: earnings.monthly * price,
  } : undefined;

  return {
    currency,
    earnings,
    fiatValues,
    powerShare: share * 100, // as percentage
    isGameToken: isGameToken(currency),
  };
}

/**
 * Calculate total earnings across all coins
 */
export function calculateTotalEarnings(
  coinEarnings: CoinEarnings[],
  period: Period
): { crypto: Record<string, number>; fiat: number } {
  const crypto: Record<string, number> = {};
  let fiat = 0;

  for (const coin of coinEarnings) {
    crypto[coin.currency] = coin.earnings[period];
    
    if (coin.fiatValues) {
      fiat += coin.fiatValues[period];
    }
  }

  return { crypto, fiat };
}

/**
 * Format currency amount for display
 */
export function formatCryptoAmount(amount: number, currency: string): string {
  // Safety check for invalid numbers
  if (amount === null || amount === undefined || !Number.isFinite(amount) || Number.isNaN(amount)) {
    return '0.00';
  }
  
  // Different precision based on typical values
  let decimals = 6;
  
  if (currency === 'BTC') {
    decimals = 8;
  } else if (['ETH', 'BNB', 'SOL', 'LTC'].includes(currency)) {
    decimals = 6;
  } else if (['DOGE', 'XRP', 'TRX'].includes(currency)) {
    decimals = 4;
  }
  
  // Ensure decimals is within valid range (0-20) and is an integer
  decimals = Math.floor(Math.min(20, Math.max(0, decimals)));

  try {
    return amount.toLocaleString('en-US', {
      minimumFractionDigits: Math.min(2, decimals),
      maximumFractionDigits: decimals,
    });
  } catch {
    return amount.toFixed(2);
  }
}

/**
 * Format fiat amount for display
 */
export function formatFiatAmount(amount: number | null | undefined, currency: string = 'USDT'): string {
  const symbol = getFiatSymbol(currency);
  
  // Safety check for invalid numbers
  if (amount === null || amount === undefined || !Number.isFinite(amount) || Number.isNaN(amount)) {
    return `${symbol}0.00`;
  }
  
  try {
    return `${symbol}${amount.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  } catch {
    return `${symbol}${amount.toFixed(2)}`;
  }
}

/**
 * Get currency symbol for fiat
 */
function getFiatSymbol(currency: string): string {
  const symbols: Record<string, string> = {
    'USDT': '$',
    'USD': '$',
    'TRY': '₺',
    'EUR': '€',
    'GBP': '£',
    'RUB': '₽',
    'BRL': 'R$',
  };
  
  return symbols[currency] || '';
}

/**
 * Get period display name
 */
export function getPeriodName(period: Period, locale: string = 'en'): string {
  const names: Record<string, Record<Period, string>> = {
    en: {
      hourly: 'Hourly',
      daily: 'Daily',
      weekly: 'Weekly',
      monthly: 'Monthly',
    },
    tr: {
      hourly: 'Saatlik',
      daily: 'Günlük',
      weekly: 'Haftalık',
      monthly: 'Aylık',
    },
  };

  return names[locale]?.[period] || names.en[period];
}

/**
 * Parse reward value from DOM text
 * Handles formats like "0.000076" or spans with "0" + ".000076" + small "30"
 */
export function parseRewardValue(text: string): number {
  // Remove any whitespace and join all parts
  const cleaned = text.replace(/\s+/g, '').replace(',', '.');
  const value = parseFloat(cleaned);
  
  return isNaN(value) ? 0 : value;
}
