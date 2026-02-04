import { RollercoinData, LeagueData } from '../types';

/**
 * Background service worker for the Rollercoin Calculator extension
 * Handles data storage and communication between content script and popup
 */

// Storage keys for cached data
const STORAGE_KEY = 'rollercoin_data';
const LEAGUE_STORAGE_KEY = 'rollercoin_league_data';

/**
 * Store Rollercoin data in chrome.storage.local
 */
async function storeData(data: RollercoinData): Promise<void> {
  try {
    await chrome.storage.local.set({ [STORAGE_KEY]: data });
    console.log('Rollercoin Calculator: Data stored', data);
  } catch (error) {
    console.error('Rollercoin Calculator: Error storing data', error);
  }
}

/**
 * Store League data in chrome.storage.local
 */
async function storeLeagueData(data: LeagueData): Promise<void> {
  try {
    await chrome.storage.local.set({ [LEAGUE_STORAGE_KEY]: data });
    console.log('Rollercoin Calculator: League data stored', data);
  } catch (error) {
    console.error('Rollercoin Calculator: Error storing league data', error);
  }
}

/**
 * Get stored Rollercoin data
 */
async function getData(): Promise<RollercoinData | null> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    return result[STORAGE_KEY] || null;
  } catch (error) {
    console.error('Rollercoin Calculator: Error getting data', error);
    return null;
  }
}

/**
 * Get stored League data
 */
async function getLeagueData(): Promise<LeagueData | null> {
  try {
    const result = await chrome.storage.local.get(LEAGUE_STORAGE_KEY);
    return result[LEAGUE_STORAGE_KEY] || null;
  } catch (error) {
    console.error('Rollercoin Calculator: Error getting league data', error);
    return null;
  }
}

/**
 * Handle messages from content script and popup
 */
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'ROLLERCOIN_DATA_UPDATE') {
    // Store data from content script
    storeData(message.data);
    sendResponse({ success: true });
    return true;
  }

  if (message.type === 'LEAGUE_DATA_UPDATE') {
    // Store league data from content script
    storeLeagueData(message.leagueData);
    sendResponse({ success: true });
    return true;
  }

  if (message.type === 'GET_STORED_DATA') {
    // Return stored data to popup
    Promise.all([getData(), getLeagueData()]).then(([data, leagueData]) => {
      sendResponse({ success: true, data, leagueData });
    });
    return true; // Keep channel open for async response
  }

  if (message.type === 'GET_LEAGUE_DATA') {
    // Return stored league data
    getLeagueData().then(leagueData => {
      sendResponse({ success: !!leagueData, data: leagueData });
    });
    return true;
  }

  return false;
});

/**
 * Handle extension installation or update
 */
chrome.runtime.onInstalled.addListener((details) => {
  console.log('Rollercoin Calculator: Extension installed/updated', details.reason);

  if (details.reason === 'install') {
    // First install - could show welcome page or set defaults
    chrome.storage.local.set({
      settings: {
        fiatCurrency: 'USDT',
        defaultPeriod: 'daily',
      }
    });
  }
});

/**
 * Handle tab updates - re-inject content script if needed
 */
chrome.tabs.onUpdated.addListener((_tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url?.includes('rollercoin.com')) {
    // Page loaded on Rollercoin - content script should auto-inject
    console.log('Rollercoin Calculator: Rollercoin page loaded', tab.url);
  }
});

// ===============================
// Currencies Config API Fetch
// ===============================

const CURRENCIES_CONFIG_KEY = 'rollercoin_currencies_config';
const CURRENCIES_CONFIG_LAST_UPDATE_KEY = 'rollercoin_currencies_config_last_update';
const CURRENCIES_API_URL = 'https://rollercoin.com/api/wallet/get-currencies-config';
const UPDATE_INTERVAL_HOURS = 6; // Update every 6 hours

interface CurrencyConfigAPI {
  name: string;
  code: string;
  display_name: string;
  min: number;
  to_small: number;
  is_can_be_mined: boolean;
  disabled_withdraw: boolean;
  is_in_game_currency: boolean;
  balance_key: string;
  precision_to_balance: number;
}

/**
 * Fetch currencies config from Rollercoin API
 */
async function fetchCurrenciesConfig(): Promise<void> {
  try {
    console.log('Rollercoin Calculator: Fetching currencies config from API...');

    const response = await fetch(CURRENCIES_API_URL);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data.success && data.data?.currencies_config) {
      const configs: CurrencyConfigAPI[] = data.data.currencies_config;

      // Filter only minable currencies and format for our use
      const mineableConfigs = configs
        .filter(c => c.is_can_be_mined)
        .map(c => ({
          code: c.code,
          name: c.name,
          display_name: c.display_name,
          min: c.min,
          to_small: c.to_small,
          is_can_be_mined: c.is_can_be_mined,
          disabled_withdraw: c.disabled_withdraw,
          is_in_game_currency: c.is_in_game_currency,
          balance_key: c.balance_key,
          precision_to_balance: c.precision_to_balance,
        }));

      await chrome.storage.local.set({
        [CURRENCIES_CONFIG_KEY]: mineableConfigs,
        [CURRENCIES_CONFIG_LAST_UPDATE_KEY]: Date.now(),
      });

      console.log('Rollercoin Calculator: Currencies config updated -', mineableConfigs.length, 'minable currencies');
    }
  } catch (error) {
    console.error('Rollercoin Calculator: Error fetching currencies config', error);
  }
}

/**
 * Check if currencies config needs update and fetch if needed
 */
async function checkAndUpdateCurrenciesConfig(): Promise<void> {
  try {
    const result = await chrome.storage.local.get(CURRENCIES_CONFIG_LAST_UPDATE_KEY);
    const lastUpdate = result[CURRENCIES_CONFIG_LAST_UPDATE_KEY] || 0;
    const hoursSinceUpdate = (Date.now() - lastUpdate) / (1000 * 60 * 60);

    if (hoursSinceUpdate >= UPDATE_INTERVAL_HOURS) {
      await fetchCurrenciesConfig();
    } else {
      console.log('Rollercoin Calculator: Currencies config is fresh (updated', Math.round(hoursSinceUpdate), 'hours ago)');
    }
  } catch (error) {
    console.error('Rollercoin Calculator: Error checking currencies config', error);
  }
}

// Fetch on startup
checkAndUpdateCurrenciesConfig();

// Set up periodic update using alarms
chrome.alarms.create('updateCurrenciesConfig', { periodInMinutes: UPDATE_INTERVAL_HOURS * 60 });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'updateCurrenciesConfig') {
    fetchCurrenciesConfig();
  }
});

// Export empty object to make this a module
export { };
