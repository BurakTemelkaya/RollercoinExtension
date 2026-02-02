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

// Export empty object to make this a module
export {};
