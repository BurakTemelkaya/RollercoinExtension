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
  code: string;               // e.g., "sol", "btc", "rlt" (clean code for mapping)
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
  currenciesConfig?: CurrencyConfig[];  // Currency withdrawal configs
  userBalances?: UserBalances;     // User's current balances from WebSocket
}

// Currency config from wallet API (for minimum withdrawal amounts)
export interface CurrencyConfig {
  code: string;           // e.g., "btc", "eth"
  name: string;           // e.g., "BTC", "ETH"
  to_small: number;       // Divisor for coin's normal decimals
  precision?: number;     // Display precision
  precision_to_balance: number;  // Precision used for balance storage (e.g., 10 for BTC means 10^10)
  balance_key: string;    // Key to use for balance lookup
  display_name: string;   // e.g., "BTC", "POL"
  min: number;            // Minimum withdrawal amount
  is_can_be_mined: boolean;
  disabled_withdraw: boolean;
  is_in_game_currency?: boolean;  // Whether it's an in-game currency (RLT, RST, HMT)
  divider?: number;       // Block reward divider (default: 1)
}

// User balance data from WebSocket
export type UserBalances = Record<string, string>;

// Withdrawal time calculation result
export interface WithdrawTimeResult {
  currency: string;
  displayName: string;
  minWithdraw: number;
  currentBalance: number;    // Current user balance
  remainingToEarn: number;   // How much more needs to be earned
  earningPerDay: number;
  daysFromZero: number;      // Days to reach min if starting from 0
  daysToWithdraw: number;    // Days to reach min from current balance
  hoursToWithdraw: number;
  canWithdraw: boolean;      // Is withdrawal enabled for this currency
  isMining: boolean;         // Is user currently mining this
  canWithdrawNow: boolean;   // Already has enough balance to withdraw
}

// Extension settings
export interface ExtensionSettings {
  fiatCurrency: FiatCurrency;
  defaultPeriod: Period;
}

// User custom min withdraw settings
export type MinWithdrawSettings = Record<string, number>;

// User custom block reward settings (per block rewards by coin)
export type BlockRewardSettings = Record<string, number>;

// Chrome message types
export interface MessageRequest {
  type: 'GET_ROLLERCOIN_DATA' | 'GET_STORED_DATA' | 'ROLLERCOIN_DATA_UPDATE' | 'GET_LEAGUE_DATA' | 'LEAGUE_DATA_UPDATE' | 'FETCH_LEAGUE_DATA' | 'SET_API_MODE' | 'GET_API_MODE' | 'PING';
  data?: RollercoinData;
  leagueData?: LeagueData;
  enabled?: boolean;
}

export interface MessageResponse {
  success: boolean;
  data?: RollercoinData;
  leagueData?: LeagueData;
  message?: string;
}
