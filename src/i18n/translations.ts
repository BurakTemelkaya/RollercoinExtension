export type Language = 'tr' | 'en';

export const translations = {
  tr: {
    // Header
    appTitle: 'Rollercoin Hesaplayıcı',
    connected: 'Bağlı',
    offline: 'Çevrimdışı',
    
    // Power info
    totalPower: 'Toplam Güç',
    activeMining: 'Aktif Mining',
    
    // Period tabs
    hourly: 'Saatlik',
    daily: 'Günlük',
    weekly: 'Haftalık',
    monthly: 'Aylık',
    
    // Comparison table
    cryptoComparison: 'Kripto Karşılaştırma',
    gameTokens: 'Oyun Tokenlari',
    coin: 'Coin',
    leaguePower: 'Lig Gücü',
    earning: 'Kazanç',
    share: 'Pay %',
    bestBadge: 'En İyi',
    activeBadge: 'Aktif',
    noMining: 'Kazım yok',
    
    // Summary
    bestCoin: 'En Karlı Coin',
    periodEarning: 'Kazanç',
    difference: 'Fark',
    
    // Buttons
    refresh: 'Yenile',
    loading: 'Yükleniyor...',
    retry: 'Tekrar Dene',
    
    // Messages
    lastUpdate: 'Son güncelleme',
    noDataTitle: 'League Verisi Bulunamadı',
    noDataMessage: 'Rollercoin sayfasını açın. Veriler otomatik olarak yüklenecek.',
    errorApiData: 'API verisi alınamadı. Rollercoin hesabınıza giriş yaptığınızdan emin olun.',
    errorNoData: 'Veri bulunamadı. Rollercoin sitesine gidin ve giriş yapın.',
    errorLoading: 'Veri yüklenirken hata oluştu',
    dataLoading: 'Veriler yükleniyor...',
    
    // Fiat currencies
    fiatUSDT: 'USD Tether',
    fiatTRY: 'Türk Lirası',
    fiatEUR: 'Euro',
    fiatGBP: 'İngiliz Sterlini',
    fiatRUB: 'Rus Rublesi',
    fiatBRL: 'Brezilya Reali',
  },
  en: {
    // Header
    appTitle: 'Rollercoin Calculator',
    connected: 'Connected',
    offline: 'Offline',
    
    // Power info
    totalPower: 'Total Power',
    activeMining: 'Active Mining',
    
    // Period tabs
    hourly: 'Hourly',
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
    
    // Comparison table
    cryptoComparison: 'Crypto Comparison',
    gameTokens: 'Game Tokens',
    coin: 'Coin',
    leaguePower: 'League Power',
    earning: 'Earning',
    share: 'Share %',
    bestBadge: 'Best',
    activeBadge: 'Active',
    noMining: 'No mining',
    
    // Summary
    bestCoin: 'Best Coin',
    periodEarning: 'Earning',
    difference: 'Difference',
    
    // Buttons
    refresh: 'Refresh',
    loading: 'Loading...',
    retry: 'Try Again',
    
    // Messages
    lastUpdate: 'Last update',
    noDataTitle: 'League Data Not Found',
    noDataMessage: 'Open Rollercoin page. Data will load automatically.',
    errorApiData: 'Could not get API data. Make sure you are logged into Rollercoin.',
    errorNoData: 'No data found. Go to Rollercoin and log in.',
    errorLoading: 'Error loading data',
    dataLoading: 'Loading data...',
    
    // Fiat currencies
    fiatUSDT: 'USD Tether',
    fiatTRY: 'Turkish Lira',
    fiatEUR: 'Euro',
    fiatGBP: 'British Pound',
    fiatRUB: 'Russian Ruble',
    fiatBRL: 'Brazilian Real',
  },
};

export type TranslationKey = keyof typeof translations.tr;

export function t(key: TranslationKey, lang: Language): string {
  return translations[lang][key] || translations.en[key] || key;
}

export const SUPPORTED_LANGUAGES: { code: Language; name: string; flag: string }[] = [
  { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
  { code: 'en', name: 'English', flag: '🇬🇧' },
];

export const LANGUAGE_NAMES: Record<Language, string> = {
  tr: 'Türkçe',
  en: 'English',
};
