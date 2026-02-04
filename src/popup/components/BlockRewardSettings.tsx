import React, { useState, useEffect } from 'react';
import { BlockRewardSettings as BlockRewardSettingsType } from '../../types';
import { Language, t } from '../../i18n/translations';

interface BlockRewardSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
}

// Default block rewards (can vary by league)
export const DEFAULT_BLOCK_REWARDS: BlockRewardSettingsType = {
  BTC: 0.0000176,
  ETH: 0.00061,
  SOL: 0.028,
  DOGE: 12.03,
  BNB: 0.00127,
  LTC: 0.0084,
  XRP: 0.52,
  TRX: 10.83,
  POL: 7.71,
  RLT: 3.33,
  RST: 204,
  HMT: 1528,
};

// Coin icons
const COIN_ICONS: Record<string, string> = {
  'BTC': 'https://static.rollercoin.com/static/img/icons/currencies/btc.svg',
  'ETH': 'https://static.rollercoin.com/static/img/icons/currencies/eth.svg',
  'SOL': 'https://static.rollercoin.com/static/img/icons/currencies/sol.svg',
  'DOGE': 'https://static.rollercoin.com/static/img/icons/currencies/doge.svg',
  'BNB': 'https://static.rollercoin.com/static/img/icons/currencies/bnb.svg',
  'LTC': 'https://static.rollercoin.com/static/img/icons/currencies/ltc.svg',
  'XRP': 'https://static.rollercoin.com/static/img/icons/currencies/xrp.svg',
  'TRX': 'https://static.rollercoin.com/static/img/icons/currencies/trx.svg',
  'POL': 'https://static.rollercoin.com/static/img/icons/currencies/matic.svg',
  'RLT': 'https://static.rollercoin.com/static/img/icons/currencies/rlt.svg',
  'RST': 'https://static.rollercoin.com/static/img/icons/currencies/rst.svg',
  'HMT': 'https://static.rollercoin.com/static/img/icons/currencies/hmt.svg',
};

// Order for display - crypto first, then game tokens
const COIN_ORDER = ['BTC', 'ETH', 'SOL', 'BNB', 'DOGE', 'LTC', 'XRP', 'TRX', 'POL', 'RLT', 'RST', 'HMT'];

const STORAGE_KEY = 'rollercoin_block_reward_settings';
const LAST_UPDATE_KEY = 'rollercoin_block_reward_last_update';

// List of all crypto coins (excluding game tokens RLT, RST, HMT)
const CRYPTO_COINS = ['BTC', 'ETH', 'SOL', 'DOGE', 'BNB', 'LTC', 'XRP', 'TRX', 'POL'];

export async function loadBlockRewardSettings(): Promise<BlockRewardSettingsType> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    if (result[STORAGE_KEY]) {
      // Merge with defaults to ensure all coins are present
      return { ...DEFAULT_BLOCK_REWARDS, ...result[STORAGE_KEY] };
    }
  } catch (e) {
    console.error('Failed to load block reward settings:', e);
  }
  return { ...DEFAULT_BLOCK_REWARDS };
}

/**
 * Load raw block reward settings (without merging defaults)
 * Used to check which coins have been updated from league page
 */
export async function loadRawBlockRewardSettings(): Promise<BlockRewardSettingsType | null> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    return result[STORAGE_KEY] || null;
  } catch (e) {
    console.error('Failed to load raw block reward settings:', e);
    return null;
  }
}

/**
 * Check how many crypto coins have block reward data
 * Returns { updated: number, total: number, missing: string[] }
 */
export async function checkBlockRewardStatus(): Promise<{ updated: number; total: number; missing: string[] }> {
  const rawSettings = await loadRawBlockRewardSettings();
  const total = CRYPTO_COINS.length;
  
  if (!rawSettings) {
    return { updated: 0, total, missing: [...CRYPTO_COINS] };
  }
  
  const missing: string[] = [];
  let updated = 0;
  
  for (const coin of CRYPTO_COINS) {
    if (rawSettings[coin] !== undefined) {
      updated++;
    } else {
      missing.push(coin);
    }
  }
  
  return { updated, total, missing };
}

export async function loadLastUpdateTime(): Promise<number | null> {
  try {
    const result = await chrome.storage.local.get(LAST_UPDATE_KEY);
    return result[LAST_UPDATE_KEY] || null;
  } catch (e) {
    console.error('Failed to load last update time:', e);
    return null;
  }
}

export async function saveBlockRewardSettings(settings: BlockRewardSettingsType): Promise<void> {
  try {
    await chrome.storage.local.set({ [STORAGE_KEY]: settings });
  } catch (e) {
    console.error('Failed to save block reward settings:', e);
  }
}

const BlockRewardSettings: React.FC<BlockRewardSettingsProps> = ({
  isOpen,
  onClose,
  language,
}) => {
  const [settings, setSettings] = useState<BlockRewardSettingsType>({ ...DEFAULT_BLOCK_REWARDS });
  const [saved, setSaved] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<number | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadBlockRewardSettings().then(setSettings);
      loadLastUpdateTime().then(setLastUpdate);
      setSaved(false);
    }
  }, [isOpen]);

  const handleValueChange = (coin: string, value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue >= 0) {
      setSettings(prev => ({ ...prev, [coin]: numValue }));
    } else if (value === '') {
      setSettings(prev => ({ ...prev, [coin]: 0 }));
    }
  };

  const handleSave = async () => {
    await saveBlockRewardSettings(settings);
    setSaved(true);
    setTimeout(() => {
      onClose();
    }, 500);
  };

  const handleReset = () => {
    setSettings({ ...DEFAULT_BLOCK_REWARDS });
  };

  const handleGoToLeaguePage = () => {
    chrome.tabs.create({ url: 'https://rollercoin.com/game/league' });
  };

  if (!isOpen) return null;

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={e => e.stopPropagation()}>
        <div className="settings-header">
          <h3>{t('blockRewardSettingsTitle', language)}</h3>
          <button className="settings-close" onClick={onClose}>×</button>
        </div>
        
        <p className="settings-desc">{t('blockRewardSettingsDesc', language)}</p>
        
        {/* Last Update Time */}
        {lastUpdate && (
          <div className="last-update-info">
            ✅ {t('autoUpdated', language)}: {new Date(lastUpdate).toLocaleString(language === 'tr' ? 'tr-TR' : 'en-US')}
          </div>
        )}
        
        {/* Go to League Page Button */}
        <div className="league-page-link">
          <button className="go-to-league-btn" onClick={handleGoToLeaguePage}>
            🏆 {t('goToLeaguePage', language)}
          </button>
          <span className="league-hint">{t('leaguePageHint', language)}</span>
        </div>
        
        <div className="settings-list">
          {COIN_ORDER.map(coin => (
            <div key={coin} className="settings-item">
              <div className="settings-coin">
                <img 
                  src={COIN_ICONS[coin]} 
                  alt={coin} 
                  className="settings-coin-icon"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                <span className="settings-coin-name">{coin}</span>
              </div>
              <div className="settings-input-group">
                <input
                  type="number"
                  className="settings-input"
                  value={settings[coin] || 0}
                  onChange={(e) => handleValueChange(coin, e.target.value)}
                  min="0"
                  step="any"
                />
                <span className="settings-input-suffix">{t('perBlock', language)}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="settings-actions">
          <button className="settings-btn reset" onClick={handleReset}>
            {t('resetDefaults', language)}
          </button>
          <div className="settings-actions-right">
            <button className="settings-btn cancel" onClick={onClose}>
              {t('cancel', language)}
            </button>
            <button className="settings-btn save" onClick={handleSave}>
              {saved ? '✓' : t('save', language)}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlockRewardSettings;
