import { LeagueData, LeagueCurrencyData, CurrencyConfig } from '../types';

/**
 * Content script for extracting data from Rollercoin via DOM parsing
 */

// Storage keys
const LEAGUE_DATA_KEY = 'rollercoin_league_data';
const BLOCK_REWARD_SETTINGS_KEY = 'rollercoin_block_reward_settings';
const BLOCK_REWARD_LAST_UPDATE_KEY = 'rollercoin_block_reward_last_update';

// Default currencies config with hardcoded min withdraw values (updated from API 2024)
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

// Default pool power values (from WebSocket pool_power_response, in raw units)
// These are fallback values when DOM parsing fails
const DEFAULT_POOL_POWER: Record<string, number> = {
  'SAT': 2809885774084,        // BTC
  'ETH_SMALL': 2522035777396,  // ETH
  'SOL_SMALL': 4151839148373,  // SOL
  'DOGE_SMALL': 3050815259512, // DOGE
  'BNB_SMALL': 2163631736963,  // BNB
  'LTC_SMALL': 928850529645,   // LTC
  'XRP_SMALL': 1487908313055,  // XRP
  'TRX_SMALL': 4288895878847,  // TRX
  'MATIC_SMALL': 1929269880036,// POL
  'RLT': 2812911677039,        // RLT
  'RST': 1108675107540,        // RST
  'HMT': 1454535107323,        // HMT
};

// Power unit multipliers (to convert to Gh base)
const POWER_UNITS: Record<string, number> = {
  'H': 1e-9,
  'Kh': 1e-6,
  'Mh': 1e-3,
  'Gh': 1,
  'Th': 1e3,
  'Ph': 1e6,
  'Eh': 1e9,
  'Zh': 1e12,
  'Yh': 1e15,
};

/**
 * Parse power string like "13.152 Eh/s" to Gh value
 */
function parsePowerString(powerStr: string): number {
  const match = powerStr.trim().match(/([\d.,]+)\s*([A-Za-z]+)/i);
  if (!match) return 0;
  
  const value = parseFloat(match[1].replace(',', '.'));
  const unit = match[2].replace(/\/s$/i, ''); // Remove /s suffix
  
  const multiplier = POWER_UNITS[unit] || POWER_UNITS[unit.charAt(0).toUpperCase() + unit.slice(1).toLowerCase()] || 1;
  return value * multiplier;
}

/**
 * Open all reward block dropdowns by adding 'open' class
 * Returns the original open states so they can be restored
 */
function openAllDropdowns(): boolean[] {
  const rewardBlocks = document.querySelectorAll('.reward-block-wrapper');
  const originalStates: boolean[] = [];
  
  console.log('Rollercoin Calculator: Found', rewardBlocks.length, 'reward-block-wrapper elements');
  
  rewardBlocks.forEach((block, index) => {
    const wasOpen = block.classList.contains('open');
    originalStates.push(wasOpen);
    
    if (!wasOpen) {
      block.classList.add('open');
      console.log('Rollercoin Calculator: Opened dropdown', index);
    }
  });
  
  return originalStates;
}

/**
 * Restore dropdown states to their original values
 */
function restoreDropdownStates(originalStates: boolean[]): void {
  const rewardBlocks = document.querySelectorAll('.reward-block-wrapper');
  
  rewardBlocks.forEach((block, index) => {
    const shouldBeOpen = originalStates[index] ?? false;
    if (shouldBeOpen) {
      block.classList.add('open');
    } else {
      block.classList.remove('open');
    }
  });
  
  console.log('Rollercoin Calculator: Restored dropdown states');
}

/**
 * Open the React-Select dropdown by simulating proper mouse events
 * Returns true if successfully opened
 */
async function openReactSelect(selectControl: HTMLElement): Promise<boolean> {
  // Try multiple approaches to open React-Select
  
  // Approach 1: Dispatch mousedown event (React-Select listens to this)
  const mouseDownEvent = new MouseEvent('mousedown', {
    bubbles: true,
    cancelable: true,
    view: window,
    button: 0,
  });
  selectControl.dispatchEvent(mouseDownEvent);
  
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // Check if opened
  let isOpen = selectControl.classList.contains('rollercoin-select__control--menu-is-open');
  if (isOpen) {
    console.log('Rollercoin Calculator: Select opened via mousedown');
    return true;
  }
  
  // Approach 2: Find and click the dropdown indicator
  const indicator = selectControl.querySelector('.rollercoin-select__dropdown-indicator');
  if (indicator && indicator instanceof HTMLElement) {
    indicator.dispatchEvent(mouseDownEvent);
    await new Promise(resolve => setTimeout(resolve, 100));
    
    isOpen = selectControl.classList.contains('rollercoin-select__control--menu-is-open');
    if (isOpen) {
      console.log('Rollercoin Calculator: Select opened via indicator mousedown');
      return true;
    }
  }
  
  // Approach 3: Focus input and trigger events
  const input = selectControl.querySelector('input');
  if (input) {
    input.focus();
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // Dispatch click on the control
    selectControl.click();
    await new Promise(resolve => setTimeout(resolve, 100));
    
    isOpen = selectControl.classList.contains('rollercoin-select__control--menu-is-open');
    if (isOpen) {
      console.log('Rollercoin Calculator: Select opened via input focus + click');
      return true;
    }
  }
  
  console.log('Rollercoin Calculator: Could not open select with events');
  return false;
}

/**
 * Close the React-Select dropdown
 */
async function closeReactSelect(selectControl: HTMLElement): Promise<void> {
  // Click on the control again to toggle close, or blur
  const input = selectControl.querySelector('input');
  if (input) {
    input.blur();
  }
  
  // Also try escape key
  const escapeEvent = new KeyboardEvent('keydown', {
    key: 'Escape',
    code: 'Escape',
    bubbles: true,
    cancelable: true,
  });
  selectControl.dispatchEvent(escapeEvent);
  
  await new Promise(resolve => setTimeout(resolve, 100));
}

/**
 * Extract user balances from the currency select dropdown
 * Opens the select, reads balances, then closes it
 */
async function extractBalancesFromDOM(): Promise<Record<string, string> | undefined> {
  console.log('Rollercoin Calculator: Attempting to extract balances from DOM...');
  
  // Find the rollercoin select control
  const selectControl = document.querySelector('.rollercoin-select__control');
  if (!selectControl || !(selectControl instanceof HTMLElement)) {
    console.log('Rollercoin Calculator: Currency select not found');
    return undefined;
  }
  
  // Check if already open
  const wasOpen = selectControl.classList.contains('rollercoin-select__control--menu-is-open');
  
  // If not open, try to open it
  if (!wasOpen) {
    console.log('Rollercoin Calculator: Opening currency select...');
    const opened = await openReactSelect(selectControl);
    if (!opened) {
      console.log('Rollercoin Calculator: Failed to open currency select');
      return undefined;
    }
    // Wait for menu to render
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  
  // Now try to find the dropdown menu and extract balances
  const balances: Record<string, string> = {};
  
  // Currency alt name to balance key mapping
  const CURRENCY_ALT_MAP: Record<string, string> = {
    'RLT': 'rlt',
    'RST': 'rst',
    'HMT': 'hmt',
    'SAT': 'btc',
    'ETH_SMALL': 'eth',
    'SOL_SMALL': 'sol',
    'DOGE_SMALL': 'doge',
    'BNB_SMALL': 'bnb',
    'LTC_SMALL': 'ltc',
    'XRP_SMALL': 'xrp',
    'TRX_SMALL': 'trx',
    'MATIC_SMALL': 'matic',
    'ALGO_SMALL': 'algo',
  };
  
  // Look for menu options with balance info
  const menuList = document.querySelector('.rollercoin-select__menu-list');
  if (menuList) {
    const options = menuList.querySelectorAll('.rollercoin-select__option');
    console.log('Rollercoin Calculator: Found', options.length, 'options in currency select');
    
    options.forEach(option => {
      // Get currency from img alt attribute
      const img = option.querySelector('img');
      const altName = img?.getAttribute('alt') || '';
      
      // Map alt name to our balance key
      const currencyKey = CURRENCY_ALT_MAP[altName] || altName.toLowerCase().replace('_small', '');
      
      // Skip unknown currencies
      if (!currencyKey) return;
      
      // Get balance from the inner spans
      // Structure: <p><span>29</span><span>.960782<small class="btc-small-numbers">53</small></span></p>
      const innerDiv = option.querySelector('.react-select-option-inner p');
      if (innerDiv) {
        const spans = innerDiv.querySelectorAll(':scope > span');
        let balanceStr = '';
        
        spans.forEach(span => {
          // Get text content but also include small element if present
          let spanText = '';
          span.childNodes.forEach(node => {
            if (node.nodeType === Node.TEXT_NODE) {
              spanText += node.textContent || '';
            } else if (node.nodeType === Node.ELEMENT_NODE && (node as Element).tagName === 'SMALL') {
              spanText += (node as Element).textContent || '';
            }
          });
          balanceStr += spanText;
        });
        
        // Parse the balance string
        const balance = parseFloat(balanceStr.replace(',', '.'));
        if (!isNaN(balance)) {
          balances[currencyKey] = balanceStr.trim();
          console.log('Rollercoin Calculator: Balance for', currencyKey, ':', balanceStr.trim());
        }
      }
    });
  } else {
    console.log('Rollercoin Calculator: Menu list not found after opening select');
  }
  
  // Close the select if we opened it
  if (!wasOpen) {
    console.log('Rollercoin Calculator: Closing currency select...');
    await closeReactSelect(selectControl);
  }
  
  if (Object.keys(balances).length > 0) {
    console.log('Rollercoin Calculator: Extracted balances for', Object.keys(balances).length, 'currencies');
    return balances;
  }
  
  return undefined;
}

/**
 * Extract user power from DOM: <span class="power-value">13.152 Eh/s</span>
 */
function extractUserPowerFromDOM(): number {
  const powerSpan = document.querySelector('span.power-value');
  if (!powerSpan) {
    console.log('Rollercoin Calculator: Could not find power-value span');
    return 0;
  }
  
  const powerText = powerSpan.textContent || '';
  const power = parsePowerString(powerText);
  console.log('Rollercoin Calculator: Extracted user power from DOM:', powerText, '->', power, 'Gh');
  return power;
}

/**
 * Extract user's mining power allocation per currency from DOM
 * This comes from the dropdown with .currencies-dropdown-container.my-power
 * Returns a map of currency -> user power in Gh
 */
function extractUserMiningAllocationFromDOM(): Record<string, number> {
  const userPowers: Record<string, number> = {};
  
  // Find containers with 'my-power' class - these contain user's mining allocation
  const myPowerContainers = document.querySelectorAll('.currencies-dropdown-container.my-power');
  
  console.log('Rollercoin Calculator: Found', myPowerContainers.length, 'my-power containers');
  
  myPowerContainers.forEach((container, index) => {
    const items = container.querySelectorAll('.currencies-dropdown-item');
    console.log('Rollercoin Calculator: My-power container', index, 'has', items.length, 'items');
    
    items.forEach(item => {
      const currencySpan = item.querySelector('.dropdown-item-currency');
      const powerContainer = item.querySelector('.dropdown-item-power');
      const powerP = powerContainer?.querySelector('p');
      
      if (currencySpan && powerP) {
        const currency = currencySpan.textContent?.trim().toUpperCase() || '';
        const powerText = powerP.textContent?.trim() || '';
        const power = parsePowerString(powerText);
        
        if (currency && power > 0) {
          userPowers[currency] = power;
          console.log('Rollercoin Calculator: User mining', currency, ':', powerText, '->', power, 'Gh');
        }
      }
    });
  });
  
  return userPowers;
}

/**
 * Extract league powers from DOM dropdown
 * Looks for currencies in containers WITHOUT .my-power class (these have league totals)
 */
function extractLeaguePowersFromDOM(): Array<{ currency: string; power: number; isGameToken: boolean }> {
  const results: Array<{ currency: string; power: number; isGameToken: boolean }> = [];
  
  // Find all open reward blocks
  const rewardBlocks = document.querySelectorAll('.reward-block-wrapper.open');
  
  if (rewardBlocks.length === 0) {
    console.log('Rollercoin Calculator: No open reward blocks found');
    return results;
  }
  
  console.log('Rollercoin Calculator: Found', rewardBlocks.length, 'open reward blocks');
  
  // Look for currency containers WITHOUT 'my-power' class (these have league powers)
  // We need to check each reward block
  rewardBlocks.forEach((rewardBlock, blockIndex) => {
    // Get all containers in this block
    const allContainers = rewardBlock.querySelectorAll('.currencies-dropdown-container');
    
    allContainers.forEach((container, containerIndex) => {
      // Skip containers with 'my-power' class - those have user's allocation
      if (container.classList.contains('my-power')) {
        console.log('Rollercoin Calculator: Skipping my-power container in block', blockIndex);
        return;
      }
      
      // Determine if this is game tokens container
      // Check if there's a "Game Currencies" title before this container
      let isGameTokens = false;
      
      // Walk back to find the title
      let current = container.previousElementSibling;
      while (current) {
        if (current.classList.contains('power-wrapper')) {
          const title = current.querySelector('.title-block');
          if (title?.textContent?.includes('Game')) {
            isGameTokens = true;
          }
          break;
        }
        current = current.previousElementSibling;
      }
      
      const items = container.querySelectorAll('.currencies-dropdown-item');
      console.log('Rollercoin Calculator: League container', containerIndex, 'in block', blockIndex, 
                  '- game tokens:', isGameTokens, '- items:', items.length);
      
      items.forEach(item => {
        const currencySpan = item.querySelector('.dropdown-item-currency');
        const powerContainer = item.querySelector('.dropdown-item-power');
        const powerP = powerContainer?.querySelector('p');
        
        if (currencySpan && powerP) {
          const currency = currencySpan.textContent?.trim().toUpperCase() || '';
          const powerText = powerP.textContent?.trim() || '';
          
          // Skip if power text is empty or zero
          if (!powerText || powerText === '0' || powerText === '0 Gh/s') {
            return;
          }
          
          const power = parsePowerString(powerText);
          
          console.log('Rollercoin Calculator: League power for', currency, ':', powerText, '->', power, 'Gh');
          
          // Only add if we have valid power and haven't added this currency yet
          if (currency && power > 0 && !results.find(r => r.currency === currency)) {
            results.push({
              currency,
              power,
              isGameToken: isGameTokens || ['RLT', 'RST', 'HMT'].includes(currency)
            });
          }
        }
      });
    });
  });
  
  console.log('Rollercoin Calculator: Extracted', results.length, 'currencies with league powers from DOM');
  return results;
}

/**
 * Build league data from DOM extraction (fallback when API not used)
 */
function buildLeagueDataFromDOM(): LeagueData | null {
  const userPower = extractUserPowerFromDOM();
  let leaguePowers = extractLeaguePowersFromDOM();
  const userMiningAllocation = extractUserMiningAllocationFromDOM();
  
  // If no league powers from DOM, use previous stored values or default
  if (leaguePowers.length === 0) {
    console.log('Rollercoin Calculator: No league data in DOM, trying to use previous stored league powers...');
    // Try to get previous league data from storage synchronously (not ideal, but safe for fallback)
    let previousLeaguePowers: Array<{ currency: string; power: number; isGameToken: boolean }> = [];
    try {
      const prev = window.localStorage.getItem('rollercoin_league_data');
      if (prev) {
        const prevObj = JSON.parse(prev);
        if (prevObj && Array.isArray(prevObj.currencies)) {
          previousLeaguePowers = prevObj.currencies.map((c: any) => ({
            currency: c.currency,
            power: c.total_block_power,
            isGameToken: c.is_in_game_currency
          }));
        }
      }
    } catch (e) {
      // ignore
    }
    if (previousLeaguePowers.length > 0) {
      leaguePowers = previousLeaguePowers;
      console.log('Rollercoin Calculator: Used previous league powers from storage.');
    } else {
      // Build from default pool power and currencies config
      leaguePowers = DEFAULT_CURRENCIES_CONFIG.map(config => {
        const balanceKey = config.balance_key;
        const power = DEFAULT_POOL_POWER[balanceKey] || 0;
        const isGameToken = ['RLT', 'RST', 'HMT'].includes(config.display_name);
        return {
          currency: config.display_name,
          power: power,
          isGameToken: isGameToken,
        };
      });
      console.log('Rollercoin Calculator: Used default pool power values.');
    }
  }
  
  console.log('Rollercoin Calculator: User mining allocation:', userMiningAllocation);
  
  // Build currencies array
  const currencies: LeagueCurrencyData[] = leaguePowers.map(lp => {
    // Block payout values from Rollercoin League page (updated regularly)
    // These are the "Per block" values shown on /game/league
    let blockPayout = 0;
    switch (lp.currency) {
      case 'BTC': blockPayout = 0.0000176; break;   // Per block from league page
      case 'ETH': blockPayout = 0.00061; break;
      case 'SOL': blockPayout = 0.028; break;
      case 'DOGE': blockPayout = 12.03; break;
      case 'BNB': blockPayout = 0.00127; break;
      case 'LTC': blockPayout = 0.0084; break;
      case 'XRP': blockPayout = 0.52; break;
      case 'TRX': blockPayout = 10.83; break;
      case 'POL': blockPayout = 7.71; break;
      case 'RLT': blockPayout = 3.33; break;
      case 'RST': blockPayout = 204; break;
      case 'HMT': blockPayout = 1528; break;
      default: blockPayout = 0;
    }
    
    // Get user's mining power for this currency from the my-power container
    const userPowerForCurrency = userMiningAllocation[lp.currency] || 0;
    
    return {
      currency: lp.currency,
      total_block_power: lp.power,
      user_power: userPowerForCurrency,
      block_payout: blockPayout,
      block_created: '',
      is_in_game_currency: lp.isGameToken,
    };
  });
  
  // Find which currency the user is actively mining (has user_power > 0)
  const activeMiningCurrency = currencies.find(c => c.user_power > 0)?.currency;
  
  return {
    currencies,
    maxPower: Math.max(...currencies.map(c => c.total_block_power), 0),
    user_max_power: userPower,
    timestamp: Date.now(),
    currenciesConfig: DEFAULT_CURRENCIES_CONFIG,
    userBalances: undefined, // Will be filled by fetchDataFromDOM if possible
    currentMiningCurrency: activeMiningCurrency,
  };
}

/**
 * Extract current mining coin's block reward from game page
 * Looks for: <p class="title">Block <span class="reward-number">10.83</span><span class="satoshi-text">TRX</span></p>
 */
function extractCurrentMiningBlockReward(): { currency: string; reward: number } | null {
  // Find the block reward display
  const rewardNumberEl = document.querySelector('.reward-number');
  const satoshiTextEl = document.querySelector('.satoshi-text');
  
  if (!rewardNumberEl || !satoshiTextEl) {
    console.log('Rollercoin Calculator: Block reward elements not found on game page');
    return null;
  }
  
  const rewardText = rewardNumberEl.textContent?.trim() || '';
  let currencyText = satoshiTextEl.textContent?.trim().toUpperCase() || '';
  
  // Map special cases
  if (currencyText === 'MATIC') currencyText = 'POL';
  if (currencyText === 'SATOSHI' || currencyText === 'SAT') currencyText = 'BTC';
  
  const reward = parseFloat(rewardText.replace(',', '.'));
  
  if (isNaN(reward) || reward <= 0 || !currencyText) {
    console.log('Rollercoin Calculator: Could not parse block reward');
    return null;
  }
  
  console.log(`Rollercoin Calculator: Current mining block reward: ${reward} ${currencyText}`);
  return { currency: currencyText, reward };
}

/**
 * Save single block reward to storage (merge with existing)
 */
async function saveCurrentMiningBlockReward(): Promise<void> {
  const currentReward = extractCurrentMiningBlockReward();
  if (!currentReward) return;
  
  try {
    // Load existing block rewards
    const result = await chrome.storage.local.get(BLOCK_REWARD_SETTINGS_KEY);
    const existingRewards = result[BLOCK_REWARD_SETTINGS_KEY] || {};
    
    // Merge with current mining coin reward
    const updatedRewards = {
      ...existingRewards,
      [currentReward.currency]: currentReward.reward,
    };
    
    await chrome.storage.local.set({
      [BLOCK_REWARD_SETTINGS_KEY]: updatedRewards,
    });
    
    console.log(`Rollercoin Calculator: Saved ${currentReward.currency} block reward: ${currentReward.reward}`);
  } catch (error) {
    console.error('Rollercoin Calculator: Error saving current mining block reward:', error);
  }
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

/**
 * Fetch data using DOM parsing
 * Automatically opens all dropdowns, extracts data, then restores original states
 * Also tries to extract balances from the currency select
 */
async function fetchDataFromDOM(): Promise<LeagueData | null> {
  console.log('Rollercoin Calculator: Fetching data from DOM...');
  
  // Wait a bit for page to fully render
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Open all dropdowns and save original states
  const originalStates = openAllDropdowns();
  
  // Wait for content to render after opening
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // Try to extract data
  let leagueData = buildLeagueDataFromDOM();
  
  // If we got no currencies, wait a bit more and retry
  if (!leagueData || leagueData.currencies.length === 0) {
    console.log('Rollercoin Calculator: No data on first try, waiting and retrying...');
    await new Promise(resolve => setTimeout(resolve, 500));
    leagueData = buildLeagueDataFromDOM();
  }
  
  // Restore original dropdown states
  restoreDropdownStates(originalStates);
  
  // Try to extract balances from currency select (optional, won't fail if not found)
  if (leagueData) {
    try {
      const balances = await extractBalancesFromDOM();
      if (balances && Object.keys(balances).length > 0) {
        leagueData.userBalances = balances;
        console.log('Rollercoin Calculator: Added balances to league data');
      }
    } catch (e) {
      console.log('Rollercoin Calculator: Could not extract balances from DOM');
    }
  }
  
  if (leagueData && leagueData.currencies.length > 0) {
    pendingLeagueData = leagueData;
    await chrome.storage.local.set({ [LEAGUE_DATA_KEY]: leagueData });
    console.log('Rollercoin Calculator: DOM data stored -', leagueData.currencies.length, 'currencies');
  } else {
    console.log('Rollercoin Calculator: Could not extract league data from DOM');
  }
  
  return leagueData;
}

/**
 * Parse block rewards from league page DOM by clicking each currency
 * URL: https://rollercoin.com/game/league
 * Clicks each coin in "My League" card to get block reward values
 */
async function parseBlockRewardsFromLeaguePage(): Promise<Record<string, number> | null> {
  console.log('Rollercoin Calculator: Parsing block rewards from league page by clicking coins...');
  
  const blockRewards: Record<string, number> = {};
  
  // Find the current league card
  const currentLeagueCard = document.querySelector('.league-card-wrapper-inner.current-league');
  
  if (!currentLeagueCard) {
    console.log('Rollercoin Calculator: Current league card not found');
    return null;
  }
  
  // Find all currency buttons in the league card
  const currencyButtons = currentLeagueCard.querySelectorAll('.league-currency');
  
  if (currencyButtons.length === 0) {
    console.log('Rollercoin Calculator: No currency buttons found in league card');
    return null;
  }
  
  console.log(`Rollercoin Calculator: Found ${currencyButtons.length} currency buttons`);
  
  // Click each currency button and read the block reward
  for (let i = 0; i < currencyButtons.length; i++) {
    const button = currencyButtons[i] as HTMLElement;
    
    // Get currency name from the img alt attribute
    const img = button.querySelector('img');
    if (!img) continue;
    
    // Extract currency from src (e.g., "currencies/btc.svg" -> "BTC")
    const src = img.getAttribute('src') || '';
    const currencyMatch = src.match(/currencies\/([a-z]+)\.svg/i);
    if (!currencyMatch) continue;
    
    let currencyCode = currencyMatch[1].toUpperCase();
    // Map special cases
    if (currencyCode === 'MATIC') currencyCode = 'POL';
    
    // Click the button
    button.click();
    
    // Wait for UI to update
    await new Promise(resolve => setTimeout(resolve, 150));
    
    // Read the block reward text
    const blockRewardEl = currentLeagueCard.querySelector('.block-reward-text');
    if (blockRewardEl) {
      const rewardText = blockRewardEl.textContent?.trim() || '';
      // Parse value like "0.0084 LTC" or "204 RST"
      const match = rewardText.match(/([\d.,]+)/);
      if (match) {
        const numericValue = parseFloat(match[1].replace(',', '.'));
        if (!isNaN(numericValue) && numericValue > 0) {
          blockRewards[currencyCode] = numericValue;
          console.log(`Rollercoin Calculator: ${currencyCode} block reward: ${numericValue}`);
        }
      }
    }
  }
  
  if (Object.keys(blockRewards).length === 0) {
    console.log('Rollercoin Calculator: No block rewards found');
    return null;
  }
  
  console.log('Rollercoin Calculator: All block rewards:', blockRewards);
  return blockRewards;
}

/**
 * Save block rewards to storage
 */
async function saveBlockRewardsToStorage(rewards: Record<string, number>): Promise<void> {
  try {
    await chrome.storage.local.set({
      [BLOCK_REWARD_SETTINGS_KEY]: rewards,
      [BLOCK_REWARD_LAST_UPDATE_KEY]: Date.now()
    });
    console.log('Rollercoin Calculator: Block rewards saved to storage');
  } catch (error) {
    console.error('Rollercoin Calculator: Error saving block rewards:', error);
  }
}

/**
 * Check if on league page and parse block rewards
 */
async function handleLeaguePage(): Promise<void> {
  const isLeaguePage = window.location.pathname.includes('/game/league');
  
  if (!isLeaguePage) {
    return;
  }
  
  console.log('Rollercoin Calculator: On league page, will parse block rewards...');
  
  // Wait a bit for page to fully render
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  const blockRewards = await parseBlockRewardsFromLeaguePage();
  
  if (blockRewards && Object.keys(blockRewards).length > 0) {
    await saveBlockRewardsToStorage(blockRewards);
  }
}

/**
 * Initialize content script
 */
async function init() {
  console.log('Rollercoin Calculator: Content script loaded on', window.location.pathname);

  // Check if on league page and parse block rewards
  await handleLeaguePage();

  // Check if on game page and save current mining coin's block reward
  const isGamePage = window.location.pathname.includes('/game') && !window.location.pathname.includes('/game/league');
  if (isGamePage) {
    // Wait for game page to fully render, then save current mining block reward
    setTimeout(async () => {
      await saveCurrentMiningBlockReward();
    }, 2500);
  }

  // Wait for page to be ready (game page might load dynamically)
  setTimeout(async () => {
    await fetchDataFromDOM();
  }, 2000);

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
      getStoredLeagueData().then(async stored => {
        if (stored) {
          sendResponse({ success: true, data: stored });
        } else {
          const domData = await fetchDataFromDOM();
          sendResponse({ success: !!domData, data: domData });
        }
      });
      return true;
    }

    if (message.type === 'FETCH_LEAGUE_DATA') {
      (async () => {
        const domData = await fetchDataFromDOM();
        sendResponse({ success: !!domData, data: domData });
      })();
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
