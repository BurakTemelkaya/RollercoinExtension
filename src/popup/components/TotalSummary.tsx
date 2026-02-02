import React from 'react';
import { Period, FiatCurrency } from '../../types';
import { formatFiatAmount, getPeriodName } from '../../utils/calculator';

interface TotalSummaryProps {
  total: number;
  fiatCurrency: FiatCurrency;
  period: Period;
}

const TotalSummary: React.FC<TotalSummaryProps> = ({
  total,
  fiatCurrency,
  period,
}) => {
  return (
    <div className="total-summary">
      <div className="total-label">Toplam {getPeriodName(period, 'tr')} Kazanç</div>
      <div className="total-value">
        {formatFiatAmount(total, fiatCurrency)}
      </div>
      <div className="total-period">
        {fiatCurrency} cinsinden
      </div>
    </div>
  );
};

export default TotalSummary;
