import React from 'react';
import { Period } from '../../types';
import { Language, t } from '../../i18n/translations';

interface PeriodTabsProps {
  selected: Period;
  onChange: (period: Period) => void;
  language: Language;
}

const PERIODS: Period[] = ['hourly', 'daily', 'weekly', 'monthly'];

const PERIOD_KEYS: Record<Period, 'hourly' | 'daily' | 'weekly' | 'monthly'> = {
  'hourly': 'hourly',
  'daily': 'daily',
  'weekly': 'weekly',
  'monthly': 'monthly',
};

const PeriodTabs: React.FC<PeriodTabsProps> = ({ selected, onChange, language }) => {
  return (
    <div className="period-tabs">
      {PERIODS.map((period) => (
        <button
          key={period}
          className={`period-tab ${selected === period ? 'active' : ''}`}
          onClick={() => onChange(period)}
        >
          {t(PERIOD_KEYS[period], language)}
        </button>
      ))}
    </div>
  );
};

export default PeriodTabs;
