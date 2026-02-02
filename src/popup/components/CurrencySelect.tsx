import React from 'react';
import { FiatCurrency } from '../../types';
import { Language, t } from '../../i18n/translations';

interface CurrencySelectProps {
  value: FiatCurrency;
  onChange: (value: FiatCurrency) => void;
  options: FiatCurrency[];
  language: Language;
}

const FIAT_KEYS: Record<FiatCurrency, 'fiatUSDT' | 'fiatTRY' | 'fiatEUR' | 'fiatGBP' | 'fiatRUB' | 'fiatBRL'> = {
  'USDT': 'fiatUSDT',
  'TRY': 'fiatTRY',
  'EUR': 'fiatEUR',
  'GBP': 'fiatGBP',
  'RUB': 'fiatRUB',
  'BRL': 'fiatBRL',
};

const CurrencySelect: React.FC<CurrencySelectProps> = ({
  value,
  onChange,
  options,
  language,
}) => {
  return (
    <div className="select-wrapper">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as FiatCurrency)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option} - {t(FIAT_KEYS[option], language)}
          </option>
        ))}
      </select>
    </div>
  );
};

export default CurrencySelect;
