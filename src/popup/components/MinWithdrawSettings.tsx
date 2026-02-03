import React, { useState, useEffect } from 'react';
import { MinWithdrawSettings as MinWithdrawSettingsType } from '../../types';
import { Language, t } from '../../i18n/translations';

interface MinWithdrawSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
}

// Default minimum withdrawal values (only withdrawable coins)
export const DEFAULT_MIN_WITHDRAW: MinWithdrawSettingsType = {
  BTC: 0.00085,
  ETH: 0.014,
  SOL: 0.6,
  DOGE: 220,
  BNB: 0.06,
  LTC: 5,
  XRP: 40,
  TRX: 300,
  POL: 300,
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
};

// Order for display (only withdrawable coins)
const COIN_ORDER = ['BTC', 'ETH', 'SOL', 'BNB', 'DOGE', 'LTC', 'XRP', 'TRX', 'POL'];

const STORAGE_KEY = 'rollercoin_min_withdraw_settings';

export async function loadMinWithdrawSettings(): Promise<MinWithdrawSettingsType> {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    if (result[STORAGE_KEY]) {
      // Merge with defaults to ensure all coins are present
      return { ...DEFAULT_MIN_WITHDRAW, ...result[STORAGE_KEY] };
    }
  } catch (e) {
    console.error('Failed to load min withdraw settings:', e);
  }
  return { ...DEFAULT_MIN_WITHDRAW };
}

export async function saveMinWithdrawSettings(settings: MinWithdrawSettingsType): Promise<void> {
  try {
    await chrome.storage.local.set({ [STORAGE_KEY]: settings });
  } catch (e) {
    console.error('Failed to save min withdraw settings:', e);
  }
}

const MinWithdrawSettings: React.FC<MinWithdrawSettingsProps> = ({
  isOpen,
  onClose,
  language,
}) => {
  const [settings, setSettings] = useState<MinWithdrawSettingsType>({ ...DEFAULT_MIN_WITHDRAW });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadMinWithdrawSettings().then(setSettings);
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
    await saveMinWithdrawSettings(settings);
    setSaved(true);
    setTimeout(() => {
      onClose();
    }, 500);
  };

  const handleReset = () => {
    setSettings({ ...DEFAULT_MIN_WITHDRAW });
  };

  if (!isOpen) return null;

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-modal" onClick={e => e.stopPropagation()}>
        <div className="settings-header">
          <h3>{t('settingsTitle', language)}</h3>
          <button className="settings-close" onClick={onClose}>×</button>
        </div>
        
        <p className="settings-desc">{t('settingsDesc', language)}</p>
        
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
              <input
                type="number"
                className="settings-input"
                value={settings[coin] || 0}
                onChange={(e) => handleValueChange(coin, e.target.value)}
                min="0"
                step="any"
              />
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

export default MinWithdrawSettings;
