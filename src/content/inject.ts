/**
 * Injected script that runs in page context
 * Can access page's authentication/cookies for API calls
 */

const API_USER_PROFILE = 'https://rollercoin.com/api/profile/user-profile-data';
const API_USER_POWER = 'https://rollercoin.com/api/profile/user-power-data';
const API_LEAGUE_POWER = 'https://rollercoin.com/api/league/league-power-distribution-info';
const API_USER_SETTINGS = 'https://rollercoin.com/api/league/user-settings';

/**
 * Get auth token from localStorage
 */
function getAuthToken(): string | null {
  // Try common token storage keys
  const keys = ['token', 'authToken', 'auth_token', 'jwtToken', 'jwt', 'accessToken', 'access_token'];
  
  for (const key of keys) {
    const value = localStorage.getItem(key);
    if (value) {
      console.log('Rollercoin Inject: Found token in localStorage key:', key);
      return value;
    }
  }
  
  // Also try sessionStorage
  for (const key of keys) {
    const value = sessionStorage.getItem(key);
    if (value) {
      console.log('Rollercoin Inject: Found token in sessionStorage key:', key);
      return value;
    }
  }
  
  // Try to find token in any localStorage key
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      const value = localStorage.getItem(key);
      if (value && value.length > 50 && value.length < 500) {
        // Might be a JWT token
        if (value.includes('.') && value.split('.').length === 3) {
          console.log('Rollercoin Inject: Found potential JWT in key:', key);
          return value;
        }
      }
    }
  }
  
  return null;
}

/**
 * Get CSRF token from cookie
 */
function getCsrfToken(): string | null {
  // Parse x-csrf cookie
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'x-csrf') {
      try {
        const decoded = decodeURIComponent(value);
        const parsed = JSON.parse(decoded);
        if (parsed.token) {
          console.log('Rollercoin Inject: Found CSRF token');
          return parsed.token;
        }
      } catch (e) {
        console.log('Rollercoin Inject: Error parsing CSRF cookie');
      }
    }
  }
  return null;
}

async function fetchRollercoinData() {
  try {
    const authToken = getAuthToken();
    const csrfToken = getCsrfToken();
    
    console.log('Rollercoin Inject: Auth token found:', !!authToken);
    console.log('Rollercoin Inject: CSRF token found:', !!csrfToken);
    
    // Build headers
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };
    
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    if (csrfToken) {
      headers['csrf-token'] = csrfToken;
    }
    
    // Fetch user profile (for league ID)
    const profileRes = await fetch(API_USER_PROFILE, {
      method: 'GET',
      credentials: 'include',
      headers: headers
    });
    
    if (!profileRes.ok) {
      throw new Error('Profile API error: ' + profileRes.status);
    }
    
    const profileData = await profileRes.json();
    
    if (!profileData.success || !profileData.data) {
      throw new Error('Profile API failed: ' + (profileData.error || 'Unknown error'));
    }
    
    const leagueId = profileData.data.leagues_ids?.[0];
    
    if (!leagueId) {
      throw new Error('No league ID found');
    }
    
    // Fetch user power data (for current_power)
    let currentPower = 0;
    try {
      const userPowerRes = await fetch(API_USER_POWER, {
        method: 'GET',
        credentials: 'include',
        headers: headers
      });
      
      if (userPowerRes.ok) {
        const userPowerData = await userPowerRes.json();
        if (userPowerData.success && userPowerData.data) {
          currentPower = userPowerData.data.current_power || 0;
          console.log('Rollercoin Inject: Got current power:', currentPower);
        }
      }
    } catch (e) {
      console.log('Rollercoin Inject: Could not fetch user power data');
    }
    
    console.log('Rollercoin Inject: Got profile - League:', leagueId, 'Power:', currentPower);
    
    // Fetch league power distribution
    const leagueRes = await fetch(API_LEAGUE_POWER + '?league_id=' + leagueId, {
      method: 'GET',
      credentials: 'include',
      headers: headers
    });
    
    if (!leagueRes.ok) {
      throw new Error('League API error: ' + leagueRes.status);
    }
    
    const leagueData = await leagueRes.json();
    
    if (!leagueData.success || !leagueData.data) {
      throw new Error('League API failed: ' + (leagueData.error || 'Unknown error'));
    }
    
    console.log('Rollercoin Inject: Got league data -', leagueData.data.length, 'currencies');
    
    // Fetch user settings (to find mining percentages per currency)
    let userSettings: Array<{ currency: string; percent: number; is_default_currency: boolean }> = [];
    try {
      const userSettingsRes = await fetch(API_USER_SETTINGS + '?league_id=' + leagueId, {
        method: 'GET',
        credentials: 'include',
        headers: headers
      });
      
      if (userSettingsRes.ok) {
        const userSettingsJson = await userSettingsRes.json();
        if (userSettingsJson.success && userSettingsJson.data) {
          userSettings = userSettingsJson.data;
          console.log('Rollercoin Inject: Got user settings');
        }
      }
    } catch (e) {
      console.log('Rollercoin Inject: Could not fetch user settings');
    }
    
    // Find current mining currency (where percent > 0)
    const currentMining = userSettings.find(c => c.percent > 0);
    
    // Send data back to content script
    window.postMessage({
      type: 'ROLLERCOIN_DATA',
      success: true,
      data: {
        leagueId: leagueId,
        currentPower: currentPower,
        currencies: leagueData.data,
        userSettings: userSettings,
        currentMiningCurrency: currentMining?.currency || null
      }
    }, '*');
    
  } catch (error) {
    console.log('Rollercoin Inject: Error -', (error as Error).message);
    window.postMessage({
      type: 'ROLLERCOIN_DATA',
      success: false,
      error: (error as Error).message
    }, '*');
  }
}

// Listen for requests from content script
window.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'FETCH_ROLLERCOIN_DATA') {
    console.log('Rollercoin Inject: Received fetch request');
    fetchRollercoinData();
  }
});

// Auto-fetch on load
console.log('Rollercoin Inject: Script loaded, fetching data...');
setTimeout(fetchRollercoinData, 1500);
