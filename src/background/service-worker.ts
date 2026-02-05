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
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    // First install - could show welcome page or set defaults
    chrome.storage.local.set({
      settings: {
        fiatCurrency: 'USDT',
        defaultPeriod: 'daily',
      }
    });
  }

  // Register content script for MAIN world at document_start
  // This ensures WebSocket interceptor runs before page scripts
  try {
    // First unregister if exists
    try {
      await chrome.scripting.unregisterContentScripts({ ids: ['rollercoin-ws-interceptor'] });
    } catch (e) {
      // Ignore - script may not be registered
    }

    await chrome.scripting.registerContentScripts([{
      id: 'rollercoin-ws-interceptor',
      matches: ['https://rollercoin.com/*'],
      js: ['content/websocket-interceptor.js'],
      runAt: 'document_start',
      world: 'MAIN',
    }]);
  } catch (error) {
    console.error('Rollercoin Calculator: Failed to register content script', error);
  }
});

/**
 * Inject WebSocket interceptor using tabs.onUpdated
 */
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  // Inject on loading state to be as early as possible
  if (changeInfo.status !== 'loading' || !tab.url?.includes('rollercoin.com')) {
    return;
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      world: 'MAIN',
      func: () => {
        // This code runs in page context
        if ((window as any).__rollercoinWSInterceptor) return;
        (window as any).__rollercoinWSInterceptor = true;

        const OriginalWebSocket = window.WebSocket;

        (window as any).WebSocket = function (url: string | URL, protocols?: string | string[]) {
          const ws = protocols ? new OriginalWebSocket(url, protocols) : new OriginalWebSocket(url);
          const wsUrl = typeof url === 'string' ? url : url.toString();

          if (wsUrl.includes('rollercoin.com')) {
            ws.addEventListener('message', function (event: MessageEvent) {
              try {
                const rawData = event.data;
                if (typeof rawData !== 'string') return;

                let message;
                try {
                  message = JSON.parse(rawData);
                } catch {
                  return;
                }

                if (!message || !message.cmd) return;

                if (message.cmd === 'power' && message.cmdval) {
                  window.postMessage({ type: 'ROLLERCOIN_WS_POWER', data: { total: message.cmdval.total, penalty: message.cmdval.penalty || 0 } }, '*');
                }

                if (message.cmd === 'pool_power_response' && message.cmdval) {
                  window.postMessage({ type: 'ROLLERCOIN_WS_POOL_POWER', data: { currency: message.cmdval.currency, power: message.cmdval.power, league_id: message.cmdval.league_id } }, '*');
                }

                if (message.cmd === 'balance' && message.cmdval) {
                  window.postMessage({ type: 'ROLLERCOIN_WS_BALANCE', data: message.cmdval }, '*');
                }

                if (message.cmd === 'global_settings' && Array.isArray(message.cmdval)) {
                  window.postMessage({ type: 'ROLLERCOIN_WS_GLOBAL_SETTINGS', data: message.cmdval }, '*');
                }
              } catch (e) {
                // Silently ignore errors
              }
            });
          }
          return ws;
        } as any;

        (window as any).WebSocket.prototype = OriginalWebSocket.prototype;
        (window as any).WebSocket.CONNECTING = OriginalWebSocket.CONNECTING;
        (window as any).WebSocket.OPEN = OriginalWebSocket.OPEN;
        (window as any).WebSocket.CLOSING = OriginalWebSocket.CLOSING;
        (window as any).WebSocket.CLOSED = OriginalWebSocket.CLOSED;

        // ========================================
        // Fetch Interceptor for Currencies Config
        // ========================================
        if (!(window as any).__rollercoinFetchInterceptor) {
          (window as any).__rollercoinFetchInterceptor = true;

          const originalFetch = window.fetch;
          window.fetch = async function (...args) {
            const response = await originalFetch.apply(this, args);

            try {
              const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request).url;

              if (url.includes('/api/wallet/get-currencies-config')) {
                // Clone response to read body without consuming it
                const clonedResponse = response.clone();
                const data = await clonedResponse.json();

                if (data.success && data.data?.currencies_config) {
                  window.postMessage({
                    type: 'ROLLERCOIN_CURRENCIES_CONFIG',
                    data: data.data.currencies_config
                  }, '*');
                }
              }

              // Intercept user settings to get active mining currency allocation
              if (url.includes('/api/league/user-settings')) {
                const clonedResponse = response.clone();
                const data = await clonedResponse.json();

                if (data.success && Array.isArray(data.data)) {
                  window.postMessage({
                    type: 'ROLLERCOIN_USER_SETTINGS',
                    data: data.data
                  }, '*');
                }
              }
            } catch (e) {
              // Silently ignore errors to not break page
            }

            return response;
          };
        }
      }
    });
  } catch (error) {
    console.error('Rollercoin Calculator: Failed to inject interceptor', error);
  }
});

// Export empty object to make this a module
export { };
