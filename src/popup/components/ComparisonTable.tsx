import React, { useState } from 'react';
import { LeagueCurrencyData, Period, FiatCurrency, BlockRewardSettings } from '../../types';
import { formatFiatAmount } from '../../utils/calculator';
import { Language, t } from '../../i18n/translations';
import BlockRewardSettingsModal from './BlockRewardSettings';

interface ComparisonTableProps {
  leagueData: LeagueCurrencyData[];
  userPower: number; // in base units (from API)
  prices: Record<string, number>;
  period: Period;
  fiatCurrency: FiatCurrency;
  currentMiningCurrency?: string;
  language: Language;
  blockRewardSettings?: BlockRewardSettings;
  onBlockRewardSettingsChange?: () => void;
}

// Coin icon URLs from Rollercoin
const COIN_ICONS: Record<string, string> = {
  'RLT': 'https://static.rollercoin.com/static/img/icons/currencies/rlt.svg',
  'RST': 'https://static.rollercoin.com/static/img/icons/currencies/rst.svg',
  'HMT': 'https://static.rollercoin.com/static/img/icons/currencies/hmt.svg',
  'BTC': 'https://static.rollercoin.com/static/img/icons/currencies/btc.svg',
  'SAT': 'https://static.rollercoin.com/static/img/icons/currencies/btc.svg',
  'ETH': 'https://static.rollercoin.com/static/img/icons/currencies/eth.svg',
  'ETH_SMALL': 'https://static.rollercoin.com/static/img/icons/currencies/eth.svg',
  'SOL': 'https://static.rollercoin.com/static/img/icons/currencies/sol.svg',
  'SOL_SMALL': 'https://static.rollercoin.com/static/img/icons/currencies/sol.svg',
  'DOGE': 'https://static.rollercoin.com/static/img/icons/currencies/doge.svg',
  'DOGE_SMALL': 'https://static.rollercoin.com/static/img/icons/currencies/doge.svg',
  'BNB': 'https://static.rollercoin.com/static/img/icons/currencies/bnb.svg',
  'BNB_SMALL': 'https://static.rollercoin.com/static/img/icons/currencies/bnb.svg',
  'LTC': 'https://static.rollercoin.com/static/img/icons/currencies/ltc.svg',
  'LTC_SMALL': 'https://static.rollercoin.com/static/img/icons/currencies/ltc.svg',
  'XRP': 'https://static.rollercoin.com/static/img/icons/currencies/xrp.svg',
  'XRP_SMALL': 'https://static.rollercoin.com/static/img/icons/currencies/xrp.svg',
  'TRX': 'https://static.rollercoin.com/static/img/icons/currencies/trx.svg',
  'TRX_SMALL': 'https://static.rollercoin.com/static/img/icons/currencies/trx.svg',
  'POL': 'https://static.rollercoin.com/static/img/icons/currencies/matic.svg',
  'MATIC': 'https://static.rollercoin.com/static/img/icons/currencies/matic.svg',
  'MATIC_SMALL': 'https://static.rollercoin.com/static/img/icons/currencies/matic.svg',
};

// Currency mapping (currency -> Binance symbol)
const CURRENCY_BINANCE_MAP: Record<string, string> = {
  'POL': 'MATIC',
  'MATIC': 'MATIC',
};

// Blocks per period (10 min per block)
const BLOCKS_PER_PERIOD: Record<Period, number> = {
  hourly: 6,
  daily: 144,
  weekly: 1008,
  monthly: 4320,
};

interface CoinEarningRow {
  currency: string;
  displayCurrency: string;
  leaguePower: number;
  leaguePowerFormatted: string;
  blockReward: number;
  earningPerPeriod: number;
  fiatValue: number | null;
  powerShare: number;  // User's power share in league %
  userPowerShare: number;  // User's power allocation for this coin %
  isGameToken: boolean;
  userPowerAllocated: number;
}

/**
 * Format large numbers to readable hash power format
 * Note: API returns power in Gh (Gigahash), not H
 */
function formatPower(power: number): string {
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

/**
 * Format crypto amount based on currency - with full safety checks
 */
function formatCrypto(amount: number, _currency: string): string {
  // Safety check for invalid numbers
  if (amount === null || amount === undefined || !Number.isFinite(amount) || Number.isNaN(amount)) {
    return '0.00';
  }
  
  const absAmount = Math.abs(amount);
  let decimals: number;
  
  if (absAmount === 0) {
    decimals = 2;
  } else if (absAmount < 0.0001) {
    decimals = 8;
  } else if (absAmount < 0.01) {
    decimals = 6;
  } else if (absAmount < 1) {
    decimals = 4;
  } else if (absAmount < 100) {
    decimals = 2;
  } else {
    decimals = 0;
  }
  
  // Ensure decimals is within valid range (0-20) and is an integer
  decimals = Math.floor(Math.min(20, Math.max(0, decimals)));
  
  try {
    return amount.toLocaleString('en-US', {
      minimumFractionDigits: Math.min(2, decimals),
      maximumFractionDigits: decimals,
    });
  } catch {
    return amount.toFixed(2);
  }
}

const ComparisonTable: React.FC<ComparisonTableProps> = ({
  leagueData,
  userPower,
  prices,
  period,
  fiatCurrency,
  currentMiningCurrency,
  language,
  blockRewardSettings,
  onBlockRewardSettingsChange,
}) => {
  const [showBlockRewardSettings, setShowBlockRewardSettings] = useState(false);

  const handleBlockRewardSettingsClose = () => {
    setShowBlockRewardSettings(false);
    onBlockRewardSettingsChange?.();
  };

  // Calculate earnings for all currencies from league data
  const earnings: CoinEarningRow[] = leagueData.map(currency => {
    // Block reward: use user setting if available, otherwise use API value
    const apiBlockReward = Number.isFinite(currency.block_payout) ? currency.block_payout : 0;
    const blockReward = blockRewardSettings?.[currency.currency] ?? apiBlockReward;
    const totalBlockPower = Number.isFinite(currency.total_block_power) ? currency.total_block_power : 0;
    const safeUserPower = Number.isFinite(userPower) ? userPower : 0;
    
    // Calculate power share (user power / league power)
    const powerShare = totalBlockPower > 0 
      ? (safeUserPower / totalBlockPower) * 100 
      : 0;
    
    // Calculate earning per block based on power share
    const earningPerBlock = blockReward * (powerShare / 100);
    const earningPerPeriod = Number.isFinite(earningPerBlock) ? earningPerBlock * BLOCKS_PER_PERIOD[period] : 0;
    
    // Get Binance symbol for price lookup
    const binanceSymbol = CURRENCY_BINANCE_MAP[currency.currency] || currency.currency;
    const price = prices[binanceSymbol] || prices[currency.currency] || 0;
    const rawFiatValue = price && !currency.is_in_game_currency ? earningPerPeriod * price : null;
    const fiatValue = rawFiatValue !== null && Number.isFinite(rawFiatValue) ? rawFiatValue : null;
    
    // Calculate user's power allocation share (how much of user's total power is allocated to this coin)
    const userPowerShare = safeUserPower > 0 
      ? (currency.user_power / safeUserPower) * 100 
      : 0;

    return {
      currency: currency.currency,
      displayCurrency: currency.currency,
      leaguePower: totalBlockPower,
      leaguePowerFormatted: formatPower(totalBlockPower),
      blockReward,
      earningPerPeriod: Number.isFinite(earningPerPeriod) ? earningPerPeriod : 0,
      fiatValue,
      powerShare: Number.isFinite(powerShare) ? powerShare : 0,
      userPowerShare: Number.isFinite(userPowerShare) ? userPowerShare : 0,
      isGameToken: currency.is_in_game_currency,
      userPowerAllocated: currency.user_power,
    };
  });

  // Separate game tokens and crypto
  const gameTokens = earnings.filter(e => e.isGameToken);
  const cryptoCoins = earnings.filter(e => !e.isGameToken);

  // Find the best earning crypto coin (by fiat value)
  const bestCrypto = cryptoCoins.reduce((best, current) => {
    if (!best) return current;
    if (!current.fiatValue) return best;
    if (!best.fiatValue) return current;
    return current.fiatValue > best.fiatValue ? current : best;
  }, null as CoinEarningRow | null);

  // Find active mining coin
  const activeMiningCoin = earnings.find(e => e.userPowerAllocated > 0);

  // Check if user is mining multiple coins (to determine if share column should be shown)
  const coinsBeingMined = earnings.filter(e => e.userPowerAllocated > 0);
  const showShareColumn = coinsBeingMined.length > 1;

  const renderRow = (earning: CoinEarningRow, showShare: boolean) => {
    const isBest = !earning.isGameToken && bestCrypto?.currency === earning.currency;
    const isCurrent = earning.userPowerAllocated > 0 || 
                      earning.displayCurrency === currentMiningCurrency ||
                      earning.currency === currentMiningCurrency;
    
    const noMining = earning.leaguePower === 0;
    
    let rowClass = '';
    if (isBest && !isCurrent) rowClass = 'best-earning';
    if (isCurrent) rowClass = 'current-mining';
    if (noMining) rowClass = 'no-mining';
    
    return (
      <tr key={earning.currency} className={rowClass}>
        <td>
          <div className="coin-cell">
            <img 
              src={COIN_ICONS[earning.currency] || COIN_ICONS[earning.displayCurrency] || ''} 
              alt={earning.displayCurrency}
              onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
            />
            <span className="coin-symbol">{earning.displayCurrency}</span>
            {isBest && <span className="best-badge">{t('bestBadge', language)}</span>}
            {isCurrent && <span className="current-badge">{t('activeBadge', language)}</span>}
          </div>
        </td>
        <td className="league-power">
          {earning.leaguePower > 0 ? earning.leaguePowerFormatted : <span style={{opacity: 0.5}}>-</span>}
        </td>
        <td>
          {earning.leaguePower > 0 ? (
            <>
              <div className="earning-value">
                {formatCrypto(earning.earningPerPeriod, earning.displayCurrency)} {earning.displayCurrency}
              </div>
              {earning.fiatValue !== null && (
                <div className="earning-fiat">
                  ≈ {formatFiatAmount(earning.fiatValue, fiatCurrency)}
                </div>
              )}
            </>
          ) : (
            <span style={{opacity: 0.5, fontSize: '12px'}}>{t('noMining', language)}</span>
          )}
        </td>
        {showShare && (
          <td>
            {earning.userPowerAllocated > 0 && earning.userPowerShare > 0 
              ? `${earning.userPowerShare.toFixed(1)}%` 
              : <span style={{opacity: 0.5}}>-</span>}
          </td>
        )}
      </tr>
    );
  };

  const getPeriodLabel = () => {
    return t(period, language);
  };

  return (
    <div>
      {/* Best Earning Summary */}
      {bestCrypto && bestCrypto.fiatValue && (
        <div className="summary-row">
          <div className="summary-card best">
            <div className="label">{t('bestCoin', language)}</div>
            <div className="value">{bestCrypto.displayCurrency}</div>
          </div>
          <div className="summary-card">
            <div className="label">{getPeriodLabel()} {t('earning', language)}</div>
            <div className="value">{formatFiatAmount(bestCrypto.fiatValue, fiatCurrency)}</div>
          </div>
          {activeMiningCoin && activeMiningCoin.currency !== bestCrypto.currency && activeMiningCoin.fiatValue && (
            <div className="summary-card">
              <div className="label">{t('difference', language)}</div>
              <div className="value" style={{ color: '#ff6464' }}>
                -{formatFiatAmount(bestCrypto.fiatValue - activeMiningCoin.fiatValue, fiatCurrency)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Crypto Coins Table */}
      <div className="section">
        <div className="section-title with-settings">
          <div className="section-title-left">
            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
            </svg>
            {t('cryptoComparison', language)} ({getPeriodLabel()})
          </div>
          <button 
            className="section-settings-btn" 
            onClick={() => setShowBlockRewardSettings(true)}
            title={t('blockRewardSettings', language)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3"/>
              <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
            </svg>
          </button>
        </div>
        
        <BlockRewardSettingsModal
          isOpen={showBlockRewardSettings}
          onClose={handleBlockRewardSettingsClose}
          language={language}
        />
        
        <div className="table-container">
          <table className="comparison-table">
            <thead>
              <tr>
                <th>{t('coin', language)}</th>
                <th>{t('leaguePower', language)}</th>
                <th>{t('earning', language)}</th>
                {showShareColumn && <th>{t('share', language)}</th>}
              </tr>
            </thead>
            <tbody>
              {cryptoCoins
                .sort((a, b) => (b.fiatValue || 0) - (a.fiatValue || 0))
                .map(e => renderRow(e, showShareColumn))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Game Tokens Table */}
      {gameTokens.length > 0 && (
        <div className="section">
          <div className="section-title">
            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
              <path d="M21 6H3c-1.1 0-2 .9-2 2v8c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-10 7H8v3H6v-3H3v-2h3V8h2v3h3v2zm4.5 2c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm4-3c-.83 0-1.5-.67-1.5-1.5S18.67 9 19.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
            </svg>
          {t('gameTokens', language)} ({getPeriodLabel()})
        </div>
        <div className="table-container">
          <table className="comparison-table">
            <thead>
              <tr>
                <th>{t('coin', language)}</th>
                <th>{t('leaguePower', language)}</th>
                <th>{t('earning', language)}</th>
                {showShareColumn && <th>{t('share', language)}</th>}
              </tr>
            </thead>
              <tbody>
                {gameTokens.map(e => renderRow(e, showShareColumn))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ComparisonTable;
