import { LeagueData, LeagueCurrencyData, CurrencyConfig } from '../types';

/**
 * Content script for receiving WebSocket data from the interceptor
 * Interceptor is injected by background service worker via chrome.scripting.executeScript
 */

// Storage keys
const LEAGUE_DATA_KEY = 'rollercoin_league_data';
const WS_POOL_POWER_KEY = 'rollercoin_ws_pool_power';
const WS_USER_POWER_KEY = 'rollercoin_ws_user_power';
const CURRENCIES_CONFIG_KEY = 'rollercoin_currencies_config';

// WebSocket'den gelen pool power verileri (currency -> power in RAW units)
let wsPoolPowerData: Record<string, number> = {};
let wsUserPower: number = 0; // RAW unit

// Default currencies config with min withdraw values
const DEFAULT_CURRENCIES_CONFIG: CurrencyConfig[] = [
  { code: 'btc', name: 'BTC', display_name: 'BTC', min: 0.00085, is_can_be_mined: true, disabled_withdraw: false, to_small: 100000000, precision_to_balance: 10, balance_key: 'SAT' },
  { code: 'eth', name: 'ETH', display_name: 'ETH', min: 0.014, is_can_be_mined: true, disabled_withdraw: false, to_small: 10000000000, precision_to_balance: 10, balance_key: 'ETH_SMALL' },
  { code: 'sol', name: 'SOL', display_name: 'SOL', min: 0.6, is_can_be_mined: true, disabled_withdraw: false, to_small: 1000000000, precision_to_balance: 9, balance_key: 'SOL_SMALL' },
  { code: 'doge', name: 'DOGE', display_name: 'DOGE', min: 220, is_can_be_mined: true, disabled_withdraw: false, to_small: 10000, precision_to_balance: 4, balance_key: 'DOGE_SMALL' },
  { code: 'bnb', name: 'BNB', display_name: 'BNB', min: 0.06, is_can_be_mined: true, disabled_withdraw: false, to_small: 10000000000, precision_to_balance: 10, balance_key: 'BNB_SMALL' },
  { code: 'ltc', name: 'LTC', display_name: 'LTC', min: 5, is_can_be_mined: true, disabled_withdraw: false, to_small: 100000000, precision_to_balance: 8, balance_key: 'LTC_SMALL' },
  { code: 'xrp', name: 'XRP', display_name: 'XRP', min: 40, is_can_be_mined: true, disabled_withdraw: false, to_small: 1000000, precision_to_balance: 6, balance_key: 'XRP_SMALL' },
  { code: 'trx', name: 'TRX', display_name: 'TRX', min: 300, is_can_be_mined: true, disabled_withdraw: false, to_small: 10000000000, precision_to_balance: 10, balance_key: 'TRX_SMALL' },
  { code: 'matic', name: 'MATIC', display_name: 'POL', min: 300, is_can_be_mined: true, disabled_withdraw: false, to_small: 10000000000, precision_to_balance: 10, balance_key: 'MATIC_SMALL' },
  { code: 'rlt', name: 'RLT', display_name: 'RLT', min: 10, is_can_be_mined: true, disabled_withdraw: false, to_small: 1000000, precision_to_balance: 6, balance_key: 'RLT' },
  { code: 'rst', name: 'RST', display_name: 'RST', min: 100, is_can_be_mined: true, disabled_withdraw: true, to_small: 1000000, precision_to_balance: 6, balance_key: 'RST' },
  { code: 'hmt', name: 'HMT', display_name: 'HMT', min: 500, is_can_be_mined: true, disabled_withdraw: true, to_small: 1000000, precision_to_balance: 6, balance_key: 'HMT' },
];

// Fallback block rewards if global_settings is missing
const DEFAULT_BLOCK_REWARDS: Record<string, number> = {
  'BTC': 0.00035000,  // Approx 35000 SAT
  'ETH': 0.00550000,
  'BNB': 0.03500000,
  'MATIC': 50.000000,
  'SOL': 0.23000000,
  'LTC': 0.01800000,
  'DOGE': 140.000000,
  'TRX': 70.000000,
  'XRP': 20.000000,
  'RLT': 20.000000,
  'RST': 150.000000,
  'HMT': 200.000000
};

// Global settings item from WebSocket
interface GlobalSettingsItem {
  currency: string;
  block_size: number;
  pool_power_for_currency: number;
  league_id: string;
}

// Currency mapping
const CURRENCY_MAP: Record<string, { code: string; displayName: string }> = {
  'SAT': { code: 'btc', displayName: 'BTC' },
  'ETH_SMALL': { code: 'eth', displayName: 'ETH' },
  'SOL_SMALL': { code: 'sol', displayName: 'SOL' },
  'DOGE_SMALL': { code: 'doge', displayName: 'DOGE' },
  'BNB_SMALL': { code: 'bnb', displayName: 'BNB' },
  'LTC_SMALL': { code: 'ltc', displayName: 'LTC' },
  'XRP_SMALL': { code: 'xrp', displayName: 'XRP' },
  'TRX_SMALL': { code: 'trx', displayName: 'TRX' },
  'TRX': { code: 'trx', displayName: 'TRX' }, // Sometimes without SMALL suffix
  'MATIC_SMALL': { code: 'matic', displayName: 'POL' },
  'RLT': { code: 'rlt', displayName: 'RLT' },
  'RST': { code: 'rst', displayName: 'RST' },
  'HMT': { code: 'hmt', displayName: 'HMT' },
};

// Balance key mapping
const BALANCE_KEY_MAP: Record<string, string> = {
  'btc': 'btc', 'eth': 'eth', 'sol': 'sol', 'doge': 'doge',
  'bnb': 'bnb', 'ltc': 'ltc', 'xrp': 'xrp', 'trx': 'trx',
  'matic': 'matic', 'rlt': 'rlt', 'rst': 'rst', 'hmt': 'hmt',
};

/**
 * Get stored league data
 */
async function getStoredLeagueData(): Promise<LeagueData | null> {
  try {
    const result = await chrome.storage.local.get(LEAGUE_DATA_KEY);
    return result[LEAGUE_DATA_KEY] || null;
  } catch (e) {
    console.error('Rollercoin Calculator: Error getting stored league data', e);
    return null;
  }
}

/**
 * Get currencies config
 */
async function getCurrenciesConfig(): Promise<CurrencyConfig[]> {
  try {
    const result = await chrome.storage.local.get('rollercoin_currencies_config');
    return result.rollercoin_currencies_config || DEFAULT_CURRENCIES_CONFIG;
  } catch {
    return DEFAULT_CURRENCIES_CONFIG;
  }
}

/**
 * Update league data from global_settings WebSocket message
 */
async function updateLeagueDataFromGlobalSettings(settings: GlobalSettingsItem[]) {
  try {
    // Update wsPoolPowerData from global settings
    for (const item of settings) {
      wsPoolPowerData[item.currency] = item.pool_power_for_currency;
    }
    await chrome.storage.local.set({ [WS_POOL_POWER_KEY]: wsPoolPowerData });

    // Helper to generate full update
    await updateLeagueDataWithCurrentState(settings);
  } catch (e) {
    console.error('Rollercoin Calculator: Error updating league data from global settings', e);
  }
}

/**
 * Update league data from generic WebSocket updates (Power, Pool Power)
 * Uses stored wsPoolPowerData and fallback settings if global_settings is missing
 */
async function updateLeagueDataFromWS() {
  await updateLeagueDataWithCurrentState(null);
}

/**
 * Core function to rebuild LeagueData from current state
 * @param settings Optional global settings if available (provides accurate block rewards)
 */
async function updateLeagueDataWithCurrentState(settings: GlobalSettingsItem[] | null) {
  try {
    // Get user power (value comes in Gh from WebSocket)
    const userPowerResult = await chrome.storage.local.get(WS_USER_POWER_KEY);
    const userPowerGh = userPowerResult[WS_USER_POWER_KEY] || wsUserPower || 0;

    // Get mining allocation from storage (contains percent per currency)
    const allocationResult = await chrome.storage.local.get(['rollercoin_mining_allocation', 'rollercoin_mining_currency']);
    const miningAllocation = allocationResult['rollercoin_mining_allocation'] as Array<{ currency: string; percent: number }> | null;
    const activeMiningCurrency = allocationResult['rollercoin_mining_currency'] || null;

    // Get current balances
    const existing = await getStoredLeagueData();
    const userBalances = existing?.userBalances || {};

    // Get currencies config
    const currenciesConfig = await getCurrenciesConfig();

    // Determine which currencies to use
    // If we have settings, use them directly
    // If not, use keys from wsPoolPowerData combined with CURRENCY_MAP
    let currenciesToProcess: string[] = [];
    if (settings) {
      currenciesToProcess = settings.map(s => s.currency);
    } else {
      currenciesToProcess = Object.keys(CURRENCY_MAP);
    }

    // Build currencies list
    const currencies: LeagueCurrencyData[] = currenciesToProcess
      .filter(key => CURRENCY_MAP[key])
      .map(key => {
        const mapping = CURRENCY_MAP[key];

        // Block payout: Use settings if available, otherwise fallback
        let blockPayout = DEFAULT_BLOCK_REWARDS[mapping.displayName] || 0;

        // Pool Power: Use WS data if available
        let rawPoolPower = wsPoolPowerData[key] || 0;

        if (settings) {
          const settingItem = settings.find(s => s.currency === key);
          if (settingItem) {
            // Find currency config to get precision (to_small) and divider
            const config = currenciesConfig.find(c => c.code === mapping.code);
            const toSmall = config?.to_small || 1;
            const divider = config?.divider || 1;

            // Normalize block size (Raw -> Display Unit)
            // block_size / divider / to_small = display unit
            blockPayout = settingItem.block_size / divider / toSmall;
            rawPoolPower = settingItem.pool_power_for_currency;
          }
        } else {
          // If no settings, check existing data to prefer preserving known block payout
          if (existing) {
            const existingCurr = existing.currencies.find(c => c.code === mapping.code || c.currency === mapping.displayName);
            if (existingCurr && existingCurr.block_payout > 0) {
              blockPayout = existingCurr.block_payout;
            }
          }
        }

        // Pool power comes in Gh from WebSocket
        const poolPowerGh = rawPoolPower;

        // Calculate user power for this currency based on mining allocation
        // miningAllocation uses keys like TRX_SMALL, SAT, etc. which match the WS keys
        let currencyUserPower = 0;
        if (miningAllocation) {
          const allocation = miningAllocation.find(a => a.currency === key);
          if (allocation && allocation.percent > 0) {
            currencyUserPower = userPowerGh * (allocation.percent / 100);
          }
        } else if (activeMiningCurrency) {
          // Fallback: if no allocation data, check if this is the active currency
          const isActiveMining = (
            mapping.displayName === activeMiningCurrency ||
            mapping.code === activeMiningCurrency.toLowerCase() ||
            key === activeMiningCurrency
          );
          currencyUserPower = isActiveMining ? userPowerGh : 0;
        }

        return {
          currency: mapping.displayName,
          code: mapping.code === 'matic' ? 'matic' : mapping.code,
          total_block_power: poolPowerGh,
          user_power: currencyUserPower,
          block_payout: blockPayout,
          block_created: '',
          is_in_game_currency: ['RLT', 'RST', 'HMT'].includes(mapping.displayName),
        };
      })
      .filter(c => c.total_block_power > 0); // Only include active pools

    // If currencies result is empty (e.g. no pool power received yet), try to keep existing
    if (currencies.length === 0 && existing && existing.currencies.length > 0) {
      return;
    }

    const leagueData: LeagueData = {
      currencies,
      currenciesConfig,
      userBalances,
      user_max_power: userPowerGh,
      maxPower: userPowerGh,
      currentMiningCurrency: activeMiningCurrency || currencies[0]?.currency || 'BTC',
      timestamp: Date.now(),
    };

    await chrome.storage.local.set({ [LEAGUE_DATA_KEY]: leagueData });

  } catch (e) {
    console.error('Rollercoin Calculator: Error rebuilding league data', e);
  }
}

/**
 * Update league data with balances from WebSocket
 */
async function updateLeagueDataWithBalances(wsBalances: Record<string, string>) {
  try {
    const leagueData = await getStoredLeagueData();
    if (!leagueData) {
      // If data doesn't exist, try to create it
      await updateLeagueDataFromWS();
      return;
    }

    const userBalances: Record<string, string> = {};
    for (const [key, value] of Object.entries(wsBalances)) {
      const mappedKey = BALANCE_KEY_MAP[key];
      if (mappedKey) {
        userBalances[mappedKey] = value;
      }
    }

    leagueData.userBalances = userBalances;
    await chrome.storage.local.set({ [LEAGUE_DATA_KEY]: leagueData });
  } catch (e) {
    console.error('Rollercoin Calculator: Error updating league data with balances', e);
  }
}

/**
 * Listen for WebSocket messages from the interceptor (via postMessage)
 */
function setupWebSocketListener() {
  window.addEventListener('message', async (event) => {
    if (event.source !== window) return;

    // User power message
    if (event.data?.type === 'ROLLERCOIN_WS_POWER') {
      wsUserPower = event.data.data.total || 0;
      await chrome.storage.local.set({ [WS_USER_POWER_KEY]: wsUserPower });
      await updateLeagueDataFromWS();
    }

    // Pool power message (per currency)
    if (event.data?.type === 'ROLLERCOIN_WS_POOL_POWER') {
      const { currency, power } = event.data.data;
      wsPoolPowerData[currency] = power;
      await chrome.storage.local.set({ [WS_POOL_POWER_KEY]: wsPoolPowerData });
      // Don't update on EVERY pool power message to avoid spamming writes, 
      // but if we are missing data, we should. 
      // Debouncing could be good here, but for now let's just update.
      await updateLeagueDataFromWS();
    }

    // Balance message
    if (event.data?.type === 'ROLLERCOIN_WS_BALANCE') {
      const balances = event.data.data;
      const formattedBalances: Record<string, string> = {};
      for (const [key, value] of Object.entries(balances)) {
        formattedBalances[key] = String(value);
      }
      await chrome.storage.local.set({ 'rollercoin_ws_balances': formattedBalances });
      await updateLeagueDataWithBalances(formattedBalances);
    }

    // Global settings message
    if (event.data?.type === 'ROLLERCOIN_WS_GLOBAL_SETTINGS') {
      const settings = event.data.data as GlobalSettingsItem[];
      await chrome.storage.local.set({ 'rollercoin_ws_global_settings': settings });
      await updateLeagueDataFromGlobalSettings(settings);
    }

    // Currencies config from fetch interceptor
    if (event.data?.type === 'ROLLERCOIN_CURRENCIES_CONFIG') {
      const configs = event.data.data;
      // Filter only minable currencies and format for our use
      const mineableConfigs = configs
        .filter((c: any) => c.is_can_be_mined)
        .map((c: any) => ({
          code: c.code,
          name: c.name,
          display_name: c.display_name,
          min: c.min,
          to_small: c.to_small,
          precision: c.precision,
          precision_to_balance: c.precision_to_balance,
          is_can_be_mined: c.is_can_be_mined,
          disabled_withdraw: c.disabled_withdraw,
          is_in_game_currency: c.is_in_game_currency || false,
          balance_key: c.balance_key,
          divider: c.divider || 1,
        }));

      await chrome.storage.local.set({ [CURRENCIES_CONFIG_KEY]: mineableConfigs });

      // Trigger league data update to use new config
      await updateLeagueDataFromWS();
    }

    // User settings from fetch interceptor (contains mining allocation percent per currency)
    if (event.data?.type === 'ROLLERCOIN_USER_SETTINGS') {
      const settingsData = event.data.data as Array<{ currency: string; percent: number; is_default_currency: boolean }>;

      // Store the mining allocation settings
      await chrome.storage.local.set({ 'rollercoin_user_settings': settingsData });

      // Find currencies with percent > 0 (active mining)
      const activeMinings = settingsData.filter(s => s.percent > 0);

      // Store active mining currencies and trigger league data update
      if (activeMinings.length > 0) {
        // Primary mining currency (highest percent or first one)
        const primaryMining = activeMinings.reduce((a, b) => a.percent > b.percent ? a : b);

        // Convert currency key to display name (TRX_SMALL -> TRX, SAT -> BTC, etc.)
        const currencyMapping = CURRENCY_MAP[primaryMining.currency];
        const displayName = currencyMapping?.displayName || primaryMining.currency;

        await chrome.storage.local.set({
          'rollercoin_mining_currency': displayName,
          'rollercoin_mining_allocation': settingsData
        });

        // Update league data with correct mining allocation
        await updateLeagueDataFromWS();
      }
    }
  });
}

/**
 * Initialize content script
 */
function init() {
  // Setup listener for intercepted messages
  setupWebSocketListener();

  // Message handler for popup requests
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {

    if (message.type === 'GET_LEAGUE_DATA') {
      getStoredLeagueData().then(stored => {
        sendResponse({ success: !!stored, data: stored });
      });
      return true;
    }

    // Allow forcing a fetch/update
    if (message.type === 'FETCH_LEAGUE_DATA') {
      updateLeagueDataFromWS().then(() => {
        getStoredLeagueData().then(stored => {
          sendResponse({ success: !!stored, data: stored });
        });
      });
      return true;
    }

    if (message.type === 'PING') {
      sendResponse({ success: true, message: 'Content script active' });
      return true;
    }

    return false;
  });
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
