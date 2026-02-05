import React, { useEffect, useState } from 'react';
import { Period, FiatCurrency, PriceData, LeagueData, MinWithdrawSettings as MinWithdrawSettingsType } from '../types';
import { fetchPrices, SUPPORTED_FIATS } from '../services/binanceApi';
import CurrencySelect from './components/CurrencySelect';
import PeriodTabs from './components/PeriodTabs';
import ComparisonTable from './components/ComparisonTable';
import WithdrawTimeTable from './components/WithdrawTimeTable';
import { loadMinWithdrawSettings, DEFAULT_MIN_WITHDRAW } from './components/MinWithdrawSettings';
import { Language, t } from '../i18n/translations';

const App: React.FC = () => {
  const [leagueData, setLeagueData] = useState<LeagueData | null>(null);
  const [priceData, setPriceData] = useState<PriceData | null>(null);
  const [selectedFiat, setSelectedFiat] = useState<FiatCurrency>('USDT');
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('daily');
  const [language, setLanguage] = useState<Language>('tr');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isOnGamePage, setIsOnGamePage] = useState(false);
  const [leagueLoading, setLeagueLoading] = useState(false);
  const [minWithdrawSettings, setMinWithdrawSettings] = useState<MinWithdrawSettingsType>(DEFAULT_MIN_WITHDRAW);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);

  // Load language preference and data on mount
  useEffect(() => {
    chrome.storage.local.get(['rollercoin_language']).then((result) => {
      if (result.rollercoin_language) {
        setLanguage(result.rollercoin_language);
      }
    });
    loadMinWithdrawSettings().then(setMinWithdrawSettings);
    loadData();

    // Listen for storage changes to update league data in real-time (from WebSocket)
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes['rollercoin_league_data']) {
        const newLeagueData = changes['rollercoin_league_data'].newValue;
        if (newLeagueData) {
          console.log('League data updated from storage (WebSocket)');
          setLeagueData(newLeagueData);
          fetchPricesForCurrencies(newLeagueData);
        }
      }
    };

    chrome.storage.local.onChanged.addListener(handleStorageChange);

    // Cleanup listener on unmount
    return () => {
      chrome.storage.local.onChanged.removeListener(handleStorageChange);
    };
  }, []);

  // Reload settings when changed
  const handleSettingsChange = () => {
    loadMinWithdrawSettings().then(setMinWithdrawSettings);
  };



  // Save language preference when changed
  const handleLanguageChange = (newLang: Language) => {
    setLanguage(newLang);
    chrome.storage.local.set({ rollercoin_language: newLang });
  };

  // Fetch new prices when fiat currency changes
  useEffect(() => {
    if (leagueData) {
      fetchPricesForCurrencies();
    }
  }, [selectedFiat, leagueData]);

  const loadData = async () => {
    setLoading(true);
    setError(null);

    try {
      let gotLeagueData = false;

      // First, try to get stored data (always available even if not on rollercoin)
      try {
        const storedLeague = await chrome.storage.local.get('rollercoin_league_data');
        if (storedLeague.rollercoin_league_data) {
          console.log('Found stored league data');
          setLeagueData(storedLeague.rollercoin_league_data);
          await fetchPricesForCurrencies(storedLeague.rollercoin_league_data);
          gotLeagueData = true;
        }
      } catch (e) {
        console.log('Could not get stored data:', e);
      }

      // Try to get fresh data from active Rollercoin tab
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const activeTab = tabs[0];

      // Check if on any rollercoin.com page
      const isOnGame = activeTab?.url?.includes('rollercoin.com') ?? false;
      setIsOnGamePage(isOnGame);

      if (isOnGame) {
        setIsConnected(true);

        // Try to get fresh data if connected
        try {
          // Request league data from content script
          const leagueResponse = await chrome.tabs.sendMessage(activeTab.id!, { type: 'GET_LEAGUE_DATA' });
          if (leagueResponse?.success && leagueResponse.data) {
            setLeagueData(leagueResponse.data);
            await fetchPricesForCurrencies(leagueResponse.data);
            gotLeagueData = true;
          }
        } catch (e) {
          console.log('Content script not responding:', e);
        }
      } else {
        setIsConnected(false);
        setIsOnGamePage(false);
      }

      if (!gotLeagueData) {
        if (activeTab?.url?.includes('rollercoin.com')) {
          setError(t('errorApiData', language));
        } else {
          setError(t('errorNoData', language));
        }
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Veri yüklenirken hata oluştu: ' + (err as Error).message);
    }

    setLoading(false);
  };

  const fetchPricesForCurrencies = async (data?: LeagueData) => {
    const sourceData = data || leagueData;
    if (!sourceData) return;

    // Get list of crypto currencies (not game tokens) from league data
    const cryptos = sourceData.currencies
      .filter(c => !c.is_in_game_currency)
      .map(c => c.code); // Use clean code (btc, doge, etc.) for Binance API

    if (cryptos.length === 0) return;

    try {
      const prices = await fetchPrices(cryptos, selectedFiat);
      console.log('Fetched prices:', prices.prices);
      setPriceData(prices);
    } catch (err) {
      console.error('Error fetching prices:', err);
    }
  };

  const handleRefresh = async () => {
    setLeagueLoading(true);

    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const activeTab = tabs[0];

      if (activeTab?.url?.includes('rollercoin.com')) {
        // Request fresh league data fetch
        try {
          const response = await chrome.tabs.sendMessage(activeTab.id!, { type: 'FETCH_LEAGUE_DATA' });
          if (response?.success && response.data) {
            setLeagueData(response.data);
            await fetchPricesForCurrencies(response.data);
            setIsConnected(true);
          }
        } catch (e) {
          console.log('Could not fetch fresh league data');
        }
      }
    } catch (err) {
      console.error('Error refreshing:', err);
    }

    setLeagueLoading(false);
    loadData();
  };

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        <p>{t('dataLoading', language)}</p>
      </div>
    );
  }

  if (error && !leagueData) {
    return (
      <div className="error">
        <p className="error-message">{error}</p>
        <button className="retry-button" onClick={handleRefresh}>
          {t('retry', language)}
        </button>
      </div>
    );
  }

  if (!leagueData) {
    return (
      <div className="no-data">
        <div className="no-data-icon">⛏️</div>
        {isOnGamePage ? (
          <>
            <h3 className="no-data-title">{t('pleaseRefresh', language)}</h3>
            <p className="no-data-message">{t('pleaseRefreshDesc', language)}</p>
            <button className="retry-button" onClick={() => chrome.tabs.reload()}>
              {t('refresh', language)}
            </button>
          </>
        ) : (
          <>
            <h3 className="no-data-title">{t('noDataTitle', language)}</h3>
            <p className="no-data-message">{t('noDataMessage', language)}</p>
            <button
              className="retry-button"
              onClick={() => chrome.tabs.create({ url: 'https://rollercoin.com/game' })}
            >
              {t('goToGamePage', language)}
            </button>
          </>
        )}
      </div>
    );
  }

  // Find current mining currency - from API or from user_power
  const currentMiningCurrency = leagueData.currentMiningCurrency ||
    leagueData.currencies.find(c => c.user_power > 0)?.currency;

  // Get user power from league data
  const userPowerBase = leagueData.user_max_power;

  return (
    <div>
      {/* Header */}
      <header className="header">
        <div className="header-title">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
          {t('appTitle', language)}
        </div>
        <div className="header-controls">
          <div className="language-dropdown">
            <button
              className="language-btn"
              onClick={() => setLangDropdownOpen(!langDropdownOpen)}
            >
              {language === 'tr' ? (
                <svg viewBox="0 0 640 480" className="flag-icon">
                  <g fillRule="evenodd">
                    <path fill="#e30a17" d="M0 0h640v480H0z" />
                    <path fill="#fff" d="M407 247c0 73-59 132-132 132s-132-59-132-132 59-132 132-132 132 59 132 132z" />
                    <path fill="#e30a17" d="M413 247c0 56-45 102-102 102s-102-46-102-102c0-57 46-102 102-102s102 46 102 102z" />
                    <path fill="#fff" d="M430 191l-31 47 4 9 47-4-4 56 23-50 52 7-42-36 19-51-44 30z" />
                  </g>
                </svg>
              ) : (
                <svg viewBox="0 0 640 480" className="flag-icon">
                  <path fill="#012169" d="M0 0h640v480H0z" />
                  <path fill="#FFF" d="m75 0 244 181L562 0h78v62L400 241l240 178v61h-80L320 301 81 480H0v-60l239-178L0 64V0z" />
                  <path fill="#C8102E" d="m424 281 216 159v40L369 281zm-184 20 6 35L54 480H0zM640 0v3L391 191l2-44L590 0zM0 0l239 176h-60L0 42z" />
                  <path fill="#FFF" d="M241 0v480h160V0zM0 160v160h640V160z" />
                  <path fill="#C8102E" d="M0 193v96h640v-96zM273 0v480h96V0z" />
                </svg>
              )}
              <span className="lang-code">{language.toUpperCase()}</span>
              <span className="dropdown-arrow">{langDropdownOpen ? '▲' : '▼'}</span>
            </button>
            {langDropdownOpen && (
              <div className="language-menu">
                <button
                  className={`language-option ${language === 'tr' ? 'active' : ''}`}
                  onClick={() => { handleLanguageChange('tr'); setLangDropdownOpen(false); }}
                >
                  <svg viewBox="0 0 640 480" className="flag-icon">
                    <g fillRule="evenodd">
                      <path fill="#e30a17" d="M0 0h640v480H0z" />
                      <path fill="#fff" d="M407 247c0 73-59 132-132 132s-132-59-132-132 59-132 132-132 132 59 132 132z" />
                      <path fill="#e30a17" d="M413 247c0 56-45 102-102 102s-102-46-102-102c0-57 46-102 102-102s102 46 102 102z" />
                      <path fill="#fff" d="M430 191l-31 47 4 9 47-4-4 56 23-50 52 7-42-36 19-51-44 30z" />
                    </g>
                  </svg>
                  <span>Türkçe</span>
                </button>
                <button
                  className={`language-option ${language === 'en' ? 'active' : ''}`}
                  onClick={() => { handleLanguageChange('en'); setLangDropdownOpen(false); }}
                >
                  <svg viewBox="0 0 640 480" className="flag-icon">
                    <path fill="#012169" d="M0 0h640v480H0z" />
                    <path fill="#FFF" d="m75 0 244 181L562 0h78v62L400 241l240 178v61h-80L320 301 81 480H0v-60l239-178L0 64V0z" />
                    <path fill="#C8102E" d="m424 281 216 159v40L369 281zm-184 20 6 35L54 480H0zM640 0v3L391 191l2-44L590 0zM0 0l239 176h-60L0 42z" />
                    <path fill="#FFF" d="M241 0v480h160V0zM0 160v160h640V160z" />
                    <path fill="#C8102E" d="M0 193v96h640v-96zM273 0v480h96V0z" />
                  </svg>
                  <span>English</span>
                </button>
              </div>
            )}
          </div>
          <div className={`status-badge ${isOnGamePage ? 'connected' : isConnected ? 'warning' : 'disconnected'}`}>
            <span className="status-dot"></span>
            {isOnGamePage ? t('connected', language) : isConnected ? t('cachedData', language) : t('offline', language)}
          </div>
        </div>
      </header>

      {/* Not on game page warning */}
      {!isOnGamePage && leagueData && (
        <div className="game-page-warning">
          <span className="warning-icon">⚠️</span>
          <span className="warning-text">{t('notOnGamePage', language)}</span>
          <button
            className="go-to-game-btn"
            onClick={() => chrome.tabs.create({ url: 'https://rollercoin.com/game' })}
          >
            {t('goToGamePage', language)}
          </button>
        </div>
      )}



      {/* Controls */}
      <div className="controls">
        <CurrencySelect
          value={selectedFiat}
          onChange={setSelectedFiat}
          options={SUPPORTED_FIATS}
          language={language}
        />
      </div>

      {/* Period Tabs */}
      <PeriodTabs
        selected={selectedPeriod}
        onChange={setSelectedPeriod}
        language={language}
      />

      {/* Power Info */}
      <div className="power-info">
        <div>
          <div className="power-label">{t('totalPower', language)}</div>
          <div className="power-value">
            {userPowerBase > 0 ? formatPowerValue(userPowerBase) : (
              <span style={{ fontSize: '0.8em', color: '#ffc107' }}>
                {t('waitingForData', language) || 'Veri bekleniyor...'}
              </span>
            )}
          </div>
        </div>
        {currentMiningCurrency && (
          <div style={{ textAlign: 'right' }}>
            <div className="power-label">{t('activeMining', language)}</div>
            <div className="power-value" style={{ fontSize: '16px' }}>{currentMiningCurrency}</div>
          </div>
        )}
      </div>

      {/* Dropdown Warning - Show if not enough currencies extracted */}
      {leagueData.currencies.length <= 1 && isConnected && (
        <div className="dropdown-warning">
          <span className="warning-icon">⚠️</span>
          <span>{t('dropdownNotOpen', language)}</span>
        </div>
      )}

      {/* Comparison Table - Shows ALL coins from League API */}
      <ComparisonTable
        leagueData={leagueData.currencies}
        userPower={userPowerBase}
        prices={priceData?.prices || {}}
        period={selectedPeriod}
        fiatCurrency={selectedFiat}
        currentMiningCurrency={currentMiningCurrency}
        language={language}
      />

      {/* Withdraw Time Table - Shows time to reach minimum withdrawal */}
      {leagueData.currenciesConfig && leagueData.currenciesConfig.length > 0 && (
        <WithdrawTimeTable
          leagueData={leagueData.currencies}
          currenciesConfig={leagueData.currenciesConfig}
          userPower={userPowerBase}
          userBalances={leagueData.userBalances}
          language={language}
          minWithdrawSettings={minWithdrawSettings}
          onSettingsChange={handleSettingsChange}
          priceData={priceData}
          selectedFiat={selectedFiat}
        />
      )}

      {/* Refresh Button */}
      <button className="refresh-button" onClick={handleRefresh} disabled={leagueLoading}>
        <svg viewBox="0 0 24 24" fill="currentColor" className={leagueLoading ? 'spinning' : ''}>
          <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
        </svg>
        {leagueLoading ? t('loading', language) : t('refresh', language)}
      </button>

      {/* Footer */}
      <div className="footer">
        {t('lastUpdate', language)}: {new Date(leagueData.timestamp).toLocaleTimeString(language === 'tr' ? 'tr-TR' : 'en-US')}
      </div>
    </div>
  );
};

// Helper function to format power value
// Note: API returns power in Gh (Gigahash), not H
function formatPowerValue(power: number): string {
  // Safety check
  if (!Number.isFinite(power) || Number.isNaN(power) || power <= 0) {
    return '0 Gh/s';
  }

  // API returns values in Gh, so start from Gh
  const units = ['Gh', 'Th', 'Ph', 'Eh', 'Zh', 'Yh'];
  let unitIndex = 0;
  let value = power;

  while (value >= 1000 && unitIndex < units.length - 1) {
    value /= 1000;
    unitIndex++;
  }

  return `${value.toFixed(2)} ${units[unitIndex]}/s`;
}

export default App;
