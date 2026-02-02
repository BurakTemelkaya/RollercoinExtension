import { FiatCurrency, PriceData } from '../types';

const BINANCE_API_BASE = 'https://api.binance.com/api/v3';

// Mapping from Rollercoin currency symbols to Binance symbols
const SYMBOL_MAPPING: Record<string, string> = {
  'BTC': 'BTC',
  'ETH': 'ETH',
  'SOL': 'SOL',
  'DOGE': 'DOGE',
  'BNB': 'BNB',
  'LTC': 'LTC',
  'XRP': 'XRP',
  'TRX': 'TRX',
  'POL': 'POL', // Polygon renamed from MATIC to POL
  'MATIC': 'POL',
};

// Supported fiat currencies on Binance
export const SUPPORTED_FIATS: FiatCurrency[] = ['USDT', 'TRY', 'EUR', 'GBP', 'RUB', 'BRL'];

// Fiat currency display names
export const FIAT_NAMES: Record<FiatCurrency, string> = {
  'USDT': 'USD Tether',
  'TRY': 'Türk Lirası',
  'EUR': 'Euro',
  'GBP': 'British Pound',
  'RUB': 'Russian Ruble',
  'BRL': 'Brazilian Real',
};

/**
 * Fetch price for a single trading pair
 */
async function fetchPrice(symbol: string): Promise<number | null> {
  try {
    const response = await fetch(`${BINANCE_API_BASE}/ticker/price?symbol=${symbol}`);
    
    if (!response.ok) {
      console.warn(`Binance API error for ${symbol}: ${response.status}`);
      return null;
    }

    const data = await response.json();
    return parseFloat(data.price);
  } catch (error) {
    console.error(`Error fetching price for ${symbol}:`, error);
    return null;
  }
}

/**
 * Fetch prices for multiple cryptocurrencies in a specific fiat
 */
export async function fetchPrices(
  cryptos: string[],
  fiat: FiatCurrency = 'USDT'
): Promise<PriceData> {
  const prices: Record<string, number> = {};
  const timestamp = Date.now();

  // For non-USDT fiats, we might need to convert through USDT
  const needsConversion = fiat !== 'USDT';
  let usdtToFiatRate = 1;

  if (needsConversion) {
    // Get USDT to fiat rate (e.g., USDTTRY)
    const fiatRate = await fetchPrice(`USDT${fiat}`);
    if (fiatRate) {
      usdtToFiatRate = fiatRate;
    } else {
      console.warn(`Could not fetch USDT${fiat} rate, using USDT prices`);
    }
  }

  // Fetch all crypto prices in parallel
  const pricePromises = cryptos.map(async (crypto) => {
    const upperCrypto = crypto.toUpperCase();
    const binanceCrypto = SYMBOL_MAPPING[upperCrypto] || upperCrypto;
    
    // First try direct pair
    let price = await fetchPrice(`${binanceCrypto}${fiat}`);
    
    // If direct pair not available, try through USDT
    if (price === null && fiat !== 'USDT') {
      const usdtPrice = await fetchPrice(`${binanceCrypto}USDT`);
      if (usdtPrice !== null) {
        price = usdtPrice * usdtToFiatRate;
      }
    }
    
    // Special fallback for POL/MATIC - try both symbols
    if (price === null && (upperCrypto === 'POL' || upperCrypto === 'MATIC')) {
      const altSymbol = upperCrypto === 'POL' ? 'MATIC' : 'POL';
      price = await fetchPrice(`${altSymbol}${fiat}`);
      if (price === null && fiat !== 'USDT') {
        const usdtPrice = await fetchPrice(`${altSymbol}USDT`);
        if (usdtPrice !== null) {
          price = usdtPrice * usdtToFiatRate;
        }
      }
    }

    return { crypto: upperCrypto, price };
  });

  const results = await Promise.all(pricePromises);

  for (const { crypto, price } of results) {
    if (price !== null) {
      prices[crypto] = price;
    }
  }

  return {
    prices,
    fiat,
    timestamp,
  };
}

/**
 * Fetch a single cryptocurrency price
 */
export async function fetchSinglePrice(
  crypto: string,
  fiat: FiatCurrency = 'USDT'
): Promise<number | null> {
  const result = await fetchPrices([crypto], fiat);
  return result.prices[crypto.toUpperCase()] || null;
}

/**
 * Get all supported cryptocurrencies
 */
export function getSupportedCryptos(): string[] {
  return Object.keys(SYMBOL_MAPPING);
}

/**
 * Check if a cryptocurrency is supported for price fetching
 */
export function isSupportedCrypto(crypto: string): boolean {
  return crypto.toUpperCase() in SYMBOL_MAPPING;
}
