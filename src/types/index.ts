// Hash power units
export type PowerUnit = 'H' | 'Kh' | 'Mh' | 'Gh' | 'Th' | 'Ph' | 'Eh' | 'Zh' | 'Yh';

// Hash power value with unit
export interface HashPower {
  value: number;
  unit: PowerUnit;
}

// Supported fiat currencies for price conversion
export type FiatCurrency = 'USDT' | 'TRY' | 'EUR' | 'GBP' | 'RUB' | 'BRL';

// Time periods for earnings calculation
export type Period = 'hourly' | 'daily' | 'weekly' | 'monthly';

// Currency data extracted from Rollercoin page
export interface CurrencyData {
  currency: string;        // e.g., "BTC", "SOL", "RLT"
  leaguePower?: HashPower; // Total league power for this currency
  userReward?: number;     // User's reward per block
  iconUrl?: string;        // Icon URL from the page
}

// Complete data extracted from Rollercoin
export interface RollercoinData {
  totalPower: HashPower;           // User's total mining power
  powerBonus: number;              // Power bonus percentage
  blockReward: number;             // Current block reward amount
  blockRewardCurrency: string;     // Currency of block reward (e.g., "SOL")
  currencies: CurrencyData[];      // All currencies with their data
  timestamp: number;               // When data was extracted
}

// Mining data for a single coin (for calculation)
export interface MiningData {
  currency: string;
  userPower: HashPower;
  leaguePower: HashPower;
  blockReward: number;
}

// Earnings data for different time periods
export interface EarningsData {
  perBlock: number;
  hourly: number;
  daily: number;
  weekly: number;
  monthly: number;
}

// Complete earnings for a single coin
export interface CoinEarnings {
  currency: string;
  earnings: EarningsData;         // Amount in crypto
  fiatValues?: EarningsData;      // Amount in selected fiat (if price available)
  powerShare: number;             // User's power share percentage
  isGameToken: boolean;           // Whether this is a game token (RLT, RST, HMT)
}

// Price data from Binance
export interface PriceData {
  prices: Record<string, number>; // currency -> price in fiat
  fiat: FiatCurrency;             // Which fiat currency
  timestamp: number;              // When prices were fetched
}

// League API response types
export interface LeagueCurrencyData {
  currency: string;           // e.g., "SOL_SMALL", "BTC", "RLT"
  total_block_power: number;  // League power in base units
  user_power: number;         // User's allocated power
  block_payout: number;       // Block reward in smallest unit
  block_created: string;      // Last block timestamp
  is_in_game_currency: boolean;
}

export interface LeagueApiResponse {
  success: boolean;
  data: {
    max_power: number;
    power_distribution: LeagueCurrencyData[];
  };
  error: string;
}

export interface LeagueData {
  currencies: LeagueCurrencyData[];
  maxPower: number;
  user_max_power: number;
  timestamp: number;
  leagueId?: string;
  currentMiningCurrency?: string;  // Currency user is currently mining
}

// Extension settings
export interface ExtensionSettings {
  fiatCurrency: FiatCurrency;
  defaultPeriod: Period;
}

// Chrome message types
export interface MessageRequest {
  type: 'GET_ROLLERCOIN_DATA' | 'GET_STORED_DATA' | 'ROLLERCOIN_DATA_UPDATE' | 'GET_LEAGUE_DATA' | 'LEAGUE_DATA_UPDATE' | 'FETCH_LEAGUE_DATA' | 'PING';
  data?: RollercoinData;
  leagueData?: LeagueData;
}

export interface MessageResponse {
  success: boolean;
  data?: RollercoinData;
  leagueData?: LeagueData;
  message?: string;
}
