import { LeagueData, LeagueCurrencyData } from '../types';

/**
 * Content script for extracting data from Rollercoin
 * Uses external injected script to make authenticated API calls
 */

// Storage keys
const LEAGUE_DATA_KEY = 'rollercoin_league_data';

// Decimal places for each currency's block_payout
const CURRENCY_DECIMALS: Record<string, number> = {
  'RLT': 6,           // 4000000 = 4 RLT
  'RST': 6,           // 244000000 = 244 RST
  'HMT': 6,           // 1528000000 = 1528 HMT
  'SAT': 10,          // 180000 = 0.000018 BTC (satoshi, needs more precision)
  'ETH_SMALL': 10,    // 5800000 = 0.00058 ETH
  'SOL_SMALL': 9,     // 26500000 = 0.0265 SOL
  'DOGE_SMALL': 4,    // 113800 = 11.38 DOGE
  'BNB_SMALL': 10,    // 17000000 = 0.0017 BNB
  'LTC_SMALL': 8,     // 853000 = 0.00853 LTC
  'XRP_SMALL': 6,     // 490000 = 0.49 XRP
  'TRX_SMALL': 10,    // 118000000000 = 11.8 TRX
  'MATIC_SMALL': 10,  // 72700000000 = 7.27 POL
};

// Currency display names
const CURRENCY_DISPLAY: Record<string, string> = {
  'SAT': 'BTC',
  'ETH_SMALL': 'ETH',
  'SOL_SMALL': 'SOL',
  'DOGE_SMALL': 'DOGE',
  'BNB_SMALL': 'BNB',
  'LTC_SMALL': 'LTC',
  'XRP_SMALL': 'XRP',
  'TRX_SMALL': 'TRX',
  'MATIC_SMALL': 'POL',
};

/**
 * Inject external script into page context
 */
function injectScript(): void {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('content/inject.js');
  script.onload = function() {
    console.log('Rollercoin Calculator: Inject script loaded');
  };
  script.onerror = function() {
    console.log('Rollercoin Calculator: Failed to load inject script');
  };
  (document.head || document.documentElement).appendChild(script);
}

/**
 * Process data received from injected script
 */
function processRollercoinData(rawData: { 
  leagueId: string; 
  currentPower: number; 
  currencies: Array<{
    currency: string;
    total_power: number;
    block_payout: number;
    is_in_game_currency: boolean;
  }>;
  userSettings?: Array<{ currency: string; percent: number; is_default_currency: boolean }>;
  currentMiningCurrency?: string | null;
}): LeagueData {
  // Create a map of user percent by currency
  const userPercentMap: Record<string, number> = {};
  if (rawData.userSettings) {
    for (const setting of rawData.userSettings) {
      const displayCurrency = CURRENCY_DISPLAY[setting.currency] || setting.currency;
      userPercentMap[displayCurrency] = setting.percent;
    }
  }
  
  const currencies: LeagueCurrencyData[] = rawData.currencies.map(item => {
    const decimals = CURRENCY_DECIMALS[item.currency] || 8;
    const blockPayout = item.block_payout / Math.pow(10, decimals);
    const displayCurrency = CURRENCY_DISPLAY[item.currency] || item.currency;
    
    // Calculate user's power for this currency based on percent
    const userPercent = userPercentMap[displayCurrency] || 0;
    const userPower = (rawData.currentPower * userPercent) / 100;

    return {
      currency: displayCurrency,
      total_block_power: item.total_power,
      user_power: userPower,
      block_payout: blockPayout,
      block_created: '',
      is_in_game_currency: item.is_in_game_currency,
    };
  });

  // Get current mining currency display name
  let currentMining: string | undefined;
  if (rawData.currentMiningCurrency) {
    currentMining = CURRENCY_DISPLAY[rawData.currentMiningCurrency] || rawData.currentMiningCurrency;
  }

  return {
    currencies,
    maxPower: Math.max(...currencies.map(c => c.total_block_power), 0),
    user_max_power: rawData.currentPower,
    timestamp: Date.now(),
    leagueId: rawData.leagueId,
    currentMiningCurrency: currentMining,
  };
}

/**
 * Get stored league data
 */
async function getStoredLeagueData(): Promise<LeagueData | null> {
  try {
    const result = await chrome.storage.local.get(LEAGUE_DATA_KEY);
    return result[LEAGUE_DATA_KEY] || null;
  } catch {
    return null;
  }
}

// Store for pending data
let pendingLeagueData: LeagueData | null = null;
let dataPromiseResolvers: Array<(data: LeagueData | null) => void> = [];

/**
 * Initialize content script
 */
function init() {
  console.log('Rollercoin Calculator: Content script loaded on', window.location.pathname);

  // Inject the script into page context
  injectScript();
  
  // Listen for data from injected script
  window.addEventListener('message', async (event) => {
    if (event.data?.type === 'ROLLERCOIN_DATA') {
      if (event.data.success && event.data.data) {
        console.log('Rollercoin Calculator: Received data from page context');
        const leagueData = processRollercoinData(event.data.data);
        pendingLeagueData = leagueData;
        
        // Store for offline use
        await chrome.storage.local.set({ [LEAGUE_DATA_KEY]: leagueData });
        console.log('Rollercoin Calculator: Data stored -', leagueData.currencies.length, 'currencies');
        
        // Resolve any pending promises
        dataPromiseResolvers.forEach(resolve => resolve(leagueData));
        dataPromiseResolvers = [];
        
        // Notify background
        chrome.runtime.sendMessage({
          type: 'LEAGUE_DATA_UPDATE',
          leagueData: leagueData,
        }).catch(() => {});
      } else {
        console.log('Rollercoin Calculator: Error from page context:', event.data.error);
        dataPromiseResolvers.forEach(resolve => resolve(null));
        dataPromiseResolvers = [];
      }
    }
  });

  // Message handler for popup requests
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    console.log('Rollercoin Calculator: Received message', message.type);

    if (message.type === 'GET_LEAGUE_DATA') {
      // First check if we have pending data
      if (pendingLeagueData) {
        sendResponse({ success: true, data: pendingLeagueData });
        return true;
      }
      
      // Try stored data
      getStoredLeagueData().then(stored => {
        if (stored) {
          sendResponse({ success: true, data: stored });
        } else {
          // Request fresh data from page
          window.postMessage({ type: 'FETCH_ROLLERCOIN_DATA' }, '*');
          
          // Wait for data with timeout
          const timeout = setTimeout(() => {
            sendResponse({ success: false, error: 'Timeout waiting for data' });
          }, 5000);
          
          dataPromiseResolvers.push((data) => {
            clearTimeout(timeout);
            sendResponse({ success: !!data, data });
          });
        }
      });
      return true;
    }

    if (message.type === 'FETCH_LEAGUE_DATA') {
      // Request fresh data from page
      window.postMessage({ type: 'FETCH_ROLLERCOIN_DATA' }, '*');
      
      // Wait for data with timeout
      const timeout = setTimeout(() => {
        sendResponse({ success: false, error: 'Timeout waiting for data' });
      }, 5000);
      
      dataPromiseResolvers.push((data) => {
        clearTimeout(timeout);
        sendResponse({ success: !!data, data });
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
