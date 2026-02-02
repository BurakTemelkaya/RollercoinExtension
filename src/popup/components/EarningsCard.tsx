import React from 'react';
import { CoinEarnings, Period, FiatCurrency } from '../../types';
import { formatCryptoAmount, formatFiatAmount } from '../../utils/calculator';

interface EarningsCardProps {
  earning: CoinEarnings;
  period: Period;
  fiatCurrency: FiatCurrency;
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
};

const EarningsCard: React.FC<EarningsCardProps> = ({
  earning,
  period,
  fiatCurrency,
}) => {
  const amount = earning.earnings[period];
  const fiatValue = earning.fiatValues?.[period];
  const iconUrl = COIN_ICONS[earning.currency] || '';

  return (
    <div className="coin-card">
      {iconUrl ? (
        <img src={iconUrl} alt={earning.currency} className="coin-icon" />
      ) : (
        <div className="coin-icon" style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          fontSize: '12px',
          fontWeight: 'bold',
        }}>
          {earning.currency.slice(0, 2)}
        </div>
      )}
      
      <div className="coin-info">
        <div className="coin-name">{earning.currency}</div>
        <div className="coin-share">
          Güç payı: {earning.powerShare.toFixed(4)}%
        </div>
      </div>
      
      <div className="coin-earnings">
        <div className="coin-amount">
          {formatCryptoAmount(amount, earning.currency)} {earning.currency}
        </div>
        {fiatValue !== undefined && (
          <div className="coin-fiat">
            ≈ {formatFiatAmount(fiatValue, fiatCurrency)}
          </div>
        )}
      </div>
    </div>
  );
};

export default EarningsCard;
