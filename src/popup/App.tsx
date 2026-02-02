import React, { useEffect, useState } from 'react';
import { Period, FiatCurrency, PriceData, LeagueData } from '../types';
import { fetchPrices, SUPPORTED_FIATS } from '../services/binanceApi';
import CurrencySelect from './components/CurrencySelect';
import PeriodTabs from './components/PeriodTabs';
import ComparisonTable from './components/ComparisonTable';
import { Language, t, SUPPORTED_LANGUAGES } from '../i18n/translations';

const App: React.FC = () => {
  const [leagueData, setLeagueData] = useState<LeagueData | null>(null);
  const [priceData, setPriceData] = useState<PriceData | null>(null);
  const [selectedFiat, setSelectedFiat] = useState<FiatCurrency>('USDT');
  const [selectedPeriod, setSelectedPeriod] = useState<Period>('daily');
  const [language, setLanguage] = useState<Language>('tr');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [leagueLoading, setLeagueLoading] = useState(false);

  // Load language preference and data on mount
  useEffect(() => {
    chrome.storage.local.get('rollercoin_language').then((result) => {
      if (result.rollercoin_language) {
        setLanguage(result.rollercoin_language);
      }
    });
    loadData();
  }, []);

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

      if (activeTab?.url?.includes('rollercoin.com')) {
        setIsConnected(true);
        
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
      }
      
      if (!gotLeagueData) {
        if (activeTab?.url?.includes('rollercoin.com')) {
          setError('API verisi alınamadı. Rollercoin hesabınıza giriş yaptığınızdan emin olun.');
        } else {
          setError('Veri bulunamadı. Rollercoin sitesine gidin ve giriş yapın.');
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
      .map(c => c.currency); // Use currency as-is, binanceApi will handle mapping

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
        <h3 className="no-data-title">{t('noDataTitle', language)}</h3>
        <p className="no-data-message">
          {t('noDataMessage', language)}
        </p>
        <button className="retry-button" onClick={handleRefresh}>
          {t('retry', language)}
        </button>
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
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
          {t('appTitle', language)}
        </div>
        <div className="header-controls">
          <select 
            className="language-select" 
            value={language} 
            onChange={(e) => handleLanguageChange(e.target.value as Language)}
          >
            {SUPPORTED_LANGUAGES.map(lang => (
              <option key={lang.code} value={lang.code}>{lang.flag}</option>
            ))}
          </select>
          <div className={`status-badge ${isConnected ? 'connected' : 'disconnected'}`}>
            <span className="status-dot"></span>
            {isConnected ? t('connected', language) : t('offline', language)}
          </div>
        </div>
      </header>

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
            {formatPowerValue(userPowerBase)}
          </div>
        </div>
        {currentMiningCurrency && (
          <div style={{ textAlign: 'right' }}>
            <div className="power-label">{t('activeMining', language)}</div>
            <div className="power-value" style={{ fontSize: '16px' }}>{currentMiningCurrency}</div>
          </div>
        )}
      </div>

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

      {/* Refresh Button */}
      <button className="refresh-button" onClick={handleRefresh} disabled={leagueLoading}>
        <svg viewBox="0 0 24 24" fill="currentColor" className={leagueLoading ? 'spinning' : ''}>
          <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
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
