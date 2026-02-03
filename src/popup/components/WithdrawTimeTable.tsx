import React, { useState } from 'react';
import { LeagueCurrencyData, CurrencyConfig, WithdrawTimeResult, UserBalances, MinWithdrawSettings, PriceData, FiatCurrency } from '../../types';
import { Language, t } from '../../i18n/translations';
import MinWithdrawSettingsModal from './MinWithdrawSettings';

interface WithdrawTimeTableProps {
  leagueData: LeagueCurrencyData[];
  currenciesConfig: CurrencyConfig[];
  userPower: number;
  userBalances?: UserBalances;
  language: Language;
  minWithdrawSettings?: MinWithdrawSettings;
  onSettingsChange?: () => void;
  priceData?: PriceData | null;
  selectedFiat: FiatCurrency;
}

// Coin icon URLs from Rollercoin
const COIN_ICONS: Record<string, string> = {
  'RLT': 'https://static.rollercoin.com/static/img/icons/currencies/rlt.svg',
  'RST': 'https://static.rollercoin.com/static/img/icons/currencies/rst.svg',
  'HMT': 'https://static.rollercoin.com/static/img/icons/currencies/hmt.svg',
  'BTC': 'https://static.rollercoin.com/static/img/icons/currencies/btc.svg',
  'ETH': 'https://static.rollercoin.com/static/img/icons/currencies/eth.svg',
  'SOL': 'https://static.rollercoin.com/static/img/icons/currencies/sol.svg',
  'DOGE': 'https://static.rollercoin.com/static/img/icons/currencies/doge.svg',
  'BNB': 'https://static.rollercoin.com/static/img/icons/currencies/bnb.svg',
  'LTC': 'https://static.rollercoin.com/static/img/icons/currencies/ltc.svg',
  'XRP': 'https://static.rollercoin.com/static/img/icons/currencies/xrp.svg',
  'TRX': 'https://static.rollercoin.com/static/img/icons/currencies/trx.svg',
  'POL': 'https://static.rollercoin.com/static/img/icons/currencies/matic.svg',
  'MATIC': 'https://static.rollercoin.com/static/img/icons/currencies/matic.svg',
  'ALGO': 'https://static.rollercoin.com/static/img/icons/currencies/algo.svg',
};

// Currency code mapping (league currency -> config code)
const CURRENCY_CODE_MAP: Record<string, string> = {
  'BTC': 'btc',
  'ETH': 'eth',
  'SOL': 'sol',
  'DOGE': 'doge',
  'BNB': 'bnb',
  'LTC': 'ltc',
  'XRP': 'xrp',
  'TRX': 'trx',
  'POL': 'matic',
  'MATIC': 'matic',
  'RLT': 'rlt',
  'RST': 'rst',
  'HMT': 'hmt',
  'ALGO': 'algo',
};



// Blocks per day (10 min per block = 144 blocks/day)
const BLOCKS_PER_DAY = 144;

/**
 * Format time duration
 */
function formatDuration(days: number, language: Language): string {
  if (days < 1) {
    const hours = Math.ceil(days * 24);
    return `${hours} ${t('hours', language)}`;
  } else if (days < 30) {
    return `${Math.ceil(days)} ${t('days', language)}`;
  } else {
    const months = Math.floor(days / 30);
    const remainingDays = Math.ceil(days % 30);
    if (remainingDays > 0) {
      return `${months} ${t('months', language)} ${remainingDays} ${t('days', language)}`;
    }
    return `${months} ${t('months', language)}`;
  }
}

/**
 * Format crypto amount
 */
function formatCrypto(amount: number): string {
  if (!Number.isFinite(amount) || amount <= 0) {
    return '0';
  }
  
  if (amount < 0.0001) {
    return amount.toFixed(8);
  } else if (amount < 0.01) {
    return amount.toFixed(6);
  } else if (amount < 1) {
    return amount.toFixed(4);
  } else if (amount < 100) {
    return amount.toFixed(2);
  } else {
    return Math.floor(amount).toLocaleString();
  }
}

const WithdrawTimeTable: React.FC<WithdrawTimeTableProps> = ({
  leagueData,
  currenciesConfig,
  userPower,
  userBalances,
  language,
  minWithdrawSettings,
  onSettingsChange,
  priceData,
  selectedFiat,
}) => {
  const [showSettings, setShowSettings] = useState(false);

  const handleSettingsClose = () => {
    setShowSettings(false);
    onSettingsChange?.();
  };

  // Fiat symbol map
  const FIAT_SYMBOLS: Record<FiatCurrency, string> = {
    'USDT': '$',
    'TRY': '₺',
    'EUR': '€',
    'GBP': '£',
    'RUB': '₽',
    'BRL': 'R$',
  };

  // Get fiat value for a crypto amount
  const getFiatValue = (cryptoAmount: number, currency: string): string | null => {
    if (!priceData?.prices) return null;
    const price = priceData.prices[currency];
    if (!price) return null;
    const fiatValue = cryptoAmount * price;
    const symbol = FIAT_SYMBOLS[selectedFiat] || '$';
    if (fiatValue < 0.01) return `${symbol}${fiatValue.toFixed(4)}`;
    if (fiatValue < 1) return `${symbol}${fiatValue.toFixed(2)}`;
    return `${symbol}${fiatValue.toFixed(2)}`;
  };

  // Calculate withdrawal times for each mineable currency
  const withdrawResults: WithdrawTimeResult[] = [];

  for (const currency of leagueData) {
    // Skip game tokens
    if (currency.is_in_game_currency) continue;

    // Find config for this currency
    const currencyCode = CURRENCY_CODE_MAP[currency.currency] || currency.currency.toLowerCase();
    const config = currenciesConfig.find(c => c.code === currencyCode);

    if (!config) continue;

    // Skip if not mineable
    if (!config.is_can_be_mined) continue;

    // Get current balance for this currency
    // Balance can come from two sources:
    // 1. API/WebSocket: raw integer value that needs to be divided (e.g., "299607825300" -> 29.96 TRX)
    // 2. DOM parsing: already formatted string (e.g., "29.960782" -> 29.96 TRX)
    const balanceKey = config.code;
    const balanceRaw = userBalances?.[balanceKey] || '0';
    
    let currentBalance: number;
    
    // Check if the balance is a decimal string (DOM format) or raw integer (API format)
    if (balanceRaw.includes('.')) {
      // DOM format: already a decimal string like "29.960782"
      currentBalance = parseFloat(balanceRaw) || 0;
    } else {
      // API format: raw integer that needs division
      // BTC uses precision_to_balance (10^10), others use to_small directly
      let balanceDivisor: number;
      if (config.code === 'btc') {
        const precision = config.precision_to_balance || 10;
        balanceDivisor = Math.pow(10, precision);
      } else {
        balanceDivisor = config.to_small || 100000000;
      }
      currentBalance = parseInt(balanceRaw, 10) / balanceDivisor;
    }

    // Calculate daily earning for this currency
    const totalBlockPower = Number.isFinite(currency.total_block_power) ? currency.total_block_power : 0;
    const safeUserPower = Number.isFinite(userPower) ? userPower : 0;
    const blockReward = Number.isFinite(currency.block_payout) ? currency.block_payout : 0;

    // Power share (user power / league power)
    const powerShare = totalBlockPower > 0 ? (safeUserPower / totalBlockPower) : 0;
    
    // Earning per block
    const earningPerBlock = blockReward * powerShare;
    
    // Earning per day
    const earningPerDay = earningPerBlock * BLOCKS_PER_DAY;

    // Days to reach minimum withdrawal (considering current balance)
    // Use user's custom setting if available, otherwise fall back to config.min
    const displayName = config.display_name || config.name;
    const minWithdraw = minWithdrawSettings?.[displayName] ?? minWithdrawSettings?.[currency.currency] ?? config.min;
    const remainingToWithdraw = Math.max(0, minWithdraw - currentBalance);
    const canWithdrawNow = currentBalance >= minWithdraw;
    
    // Days from zero (sıfırdan kazsan)
    const daysFromZero = earningPerDay > 0 ? minWithdraw / earningPerDay : Infinity;
    
    // Days with current balance (mevcut bakiyeyle devam etsen)
    const daysToWithdraw = canWithdrawNow ? 0 : (earningPerDay > 0 ? remainingToWithdraw / earningPerDay : Infinity);
    const hoursToWithdraw = daysToWithdraw * 24;

    withdrawResults.push({
      currency: currency.currency,
      displayName: config.display_name || config.name,
      minWithdraw,
      currentBalance,
      remainingToEarn: remainingToWithdraw,
      earningPerDay,
      daysFromZero,
      daysToWithdraw,
      hoursToWithdraw,
      canWithdraw: !config.disabled_withdraw,
      isMining: currency.user_power > 0,
      canWithdrawNow,
    });
  }

  // Sort by days to withdraw (fastest first), putting disabled at the end
  withdrawResults.sort((a, b) => {
    if (!a.canWithdraw && b.canWithdraw) return 1;
    if (a.canWithdraw && !b.canWithdraw) return -1;
    if (!Number.isFinite(a.daysToWithdraw) && Number.isFinite(b.daysToWithdraw)) return 1;
    if (Number.isFinite(a.daysToWithdraw) && !Number.isFinite(b.daysToWithdraw)) return -1;
    return a.daysToWithdraw - b.daysToWithdraw;
  });

  // Find fastest withdrawal option
  const fastestResult = withdrawResults.find(r => r.canWithdraw && Number.isFinite(r.daysToWithdraw));

  if (withdrawResults.length === 0) {
    return null;
  }

  return (
    <div className="withdraw-time-section">
      <h3 className="section-title with-settings">
        <div className="section-title-left">
          <span className="section-icon">⏱️</span>
          {t('withdrawTime', language)}
        </div>
        <button 
          className="section-settings-btn" 
          onClick={() => setShowSettings(true)}
          title={t('settings', language)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
          </svg>
        </button>
      </h3>
      
      <MinWithdrawSettingsModal
        isOpen={showSettings}
        onClose={handleSettingsClose}
        language={language}
      />
      
      <div className="withdraw-table">
        <div className="withdraw-header">
          <div className="withdraw-col coin-col">{t('coin', language)}</div>
          <div className="withdraw-col balance-col">{t('currentBalance', language)}</div>
          <div className="withdraw-col min-col">{t('minWithdraw', language)}</div>
          <div className="withdraw-col time-col">{t('timeToWithdraw', language)}</div>
        </div>

        {withdrawResults.map((result) => {
          const iconUrl = COIN_ICONS[result.currency] || COIN_ICONS[result.displayName];
          const isFastest = fastestResult && result.currency === fastestResult.currency;
          const balancePercent = result.minWithdraw > 0 ? Math.min(100, (result.currentBalance / result.minWithdraw) * 100) : 0;
          
          // Tooltip: Sıfırdan kazsan ne kadar sürer
          const fromZeroTooltip = Number.isFinite(result.daysFromZero) 
            ? `${t('fromZero', language)}: ${formatDuration(result.daysFromZero, language)}`
            : '';

          return (
            <div 
              key={result.currency} 
              className={`withdraw-row ${!result.canWithdraw ? 'disabled' : ''} ${result.isMining ? 'mining' : ''} ${isFastest ? 'fastest' : ''} ${result.canWithdrawNow ? 'ready' : ''}`}
            >
              <div className="withdraw-col coin-col">
                <div className="coin-info">
                  {iconUrl && (
                    <img 
                      src={iconUrl} 
                      alt={result.currency} 
                      className="coin-icon"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  )}
                  <span className="coin-name">{result.displayName}</span>
                  {result.canWithdrawNow && result.canWithdraw && (
                    <span className="badge ready-badge">✅ {t('readyToWithdraw', language)}</span>
                  )}
                  {isFastest && !result.canWithdrawNow && (
                    <span className="badge fastest-badge">{t('fastestWithdraw', language)}</span>
                  )}
                </div>
              </div>
              
              <div className="withdraw-col balance-col">
                <div className="balance-info">
                  <span className="balance-amount">{formatCrypto(result.currentBalance)}</span>
                  <div className="balance-progress">
                    <div 
                      className="balance-progress-bar" 
                      style={{ width: `${balancePercent}%` }}
                    />
                  </div>
                  <span className="balance-percent">{balancePercent.toFixed(0)}%</span>
                </div>
              </div>
              
              <div className="withdraw-col min-col">
                <span className="min-amount">{formatCrypto(result.minWithdraw)}</span>
                {getFiatValue(result.minWithdraw, result.currency) && (
                  <span className="min-fiat">≈ {getFiatValue(result.minWithdraw, result.currency)}</span>
                )}
              </div>
              
              {/* Süre - hover'da sıfırdan süreyi göster */}
              <div className="withdraw-col time-col" title={fromZeroTooltip}>
                {!result.canWithdraw ? (
                  <span className="withdraw-disabled-text">🚫 {t('withdrawDisabled', language)}</span>
                ) : result.canWithdrawNow ? (
                  <span className="can-withdraw-now">✨ {t('canWithdrawNow', language)}</span>
                ) : !Number.isFinite(result.daysToWithdraw) ? (
                  <span className="not-mining-text">-</span>
                ) : (
                  <span className={`time-value ${result.daysToWithdraw < 7 ? 'fast' : result.daysToWithdraw < 30 ? 'medium' : 'slow'}`}>
                    {formatDuration(result.daysToWithdraw, language)}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WithdrawTimeTable;
