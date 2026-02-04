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

    // Withdraw time table
    withdrawTime: 'Çekim Süreleri',
    minWithdraw: 'Min. Çekim',
    currentBalance: 'Bakiye',
    timeToWithdraw: 'Süre',
    fromZero: 'Sıfırdan',
    withBalance: 'Bakiyeyle',
    days: 'gün',
    months: 'ay',
    hours: 'saat',
    withdrawDisabled: 'Çekim Kapalı',
    notMining: 'Kazılmıyor',
    fastestWithdraw: 'En Hızlı',
    readyToWithdraw: 'Çekilebilir',
    canWithdrawNow: 'Hemen Çek!',
    remainingToEarn: 'Kalan',

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
    errorApiData: 'Lütfen Rollercoin sayfasını yenileyin ve hesabınıza giriş yaptığınızdan emin olun.',
    errorNoData: 'Veri bulunamadı. Rollercoin sitesine gidin ve giriş yapın.',
    errorLoading: 'Veri yüklenirken hata oluştu',
    dataLoading: 'Veriler yükleniyor...',
    dropdownNotOpen: 'Lütfen oyun sayfasında güç değerinizin üstüne tıklayarak dropdown\u0027ı açın, sonra Yenile butonuna basın.',
    notOnGamePage: 'Güncel veri almak için Rollercoin sayfasına gidin',
    cachedData: 'Önbellek Verisi',
    waitingForData: 'Veri bekleniyor...',
    goToGamePage: 'Oyun Sayfasına Git',
    firstTimeSetup: 'İlk Kurulum Gerekli',
    firstTimeSetupDesc: 'Blok ödüllerini yüklemek için lig sayfasını ziyaret edin. Değerler otomatik olarak kaydedilecek.',
    pleaseRefresh: 'Lütfen sayfayı yenileyin',
    pleaseRefreshDesc: 'Verileri yakalamak için scriptimizi enjekte etmemiz gerekiyor. Lütfen sayfayı bir kez yenileyin.',
    partialBlockRewards: '{count}/{total} coin güncellendi',
    partialBlockRewardsDesc: 'Tüm coinlerin blok ödüllerini görmek için lig sayfasını ziyaret edin.',

    // Fiat currencies
    fiatUSDT: 'USD Tether',
    fiatTRY: 'Türk Lirası',
    fiatEUR: 'Euro',
    fiatGBP: 'İngiliz Sterlini',
    fiatRUB: 'Rus Rublesi',
    fiatBRL: 'Brezilya Reali',

    // Settings
    settings: 'Ayarlar',
    settingsTitle: 'Minimum Çekim Limitleri',
    settingsDesc: 'Her coin için minimum çekim miktarını ayarlayın',
    save: 'Kaydet',
    cancel: 'İptal',
    resetDefaults: 'Varsayılana Sıfırla',
    settingsSaved: 'Ayarlar kaydedildi',

    // Block Reward Settings - DEPRECATED/REMOVED
    // Kept comments to avoid large diffs if needed, or just remove

    goToLeaguePage: 'Lig Sayfasına Git',
    leaguePageHint: 'Liginizin blok ödüllerini görmek için lig sayfasını ziyaret edin',
    autoUpdated: 'Lig sayfasından otomatik güncellendi',
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

    // Withdraw time table
    withdrawTime: 'Withdraw Times',
    minWithdraw: 'Min. Withdraw',
    currentBalance: 'Balance',
    timeToWithdraw: 'Time',
    fromZero: 'From Zero',
    withBalance: 'With Balance',
    days: 'days',
    months: 'month',
    hours: 'hours',
    withdrawDisabled: 'Withdraw Disabled',
    notMining: 'Not Mining',
    fastestWithdraw: 'Fastest',
    readyToWithdraw: 'Ready',
    canWithdrawNow: 'Withdraw Now!',
    remainingToEarn: 'Remaining',

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
    errorApiData: 'Please refresh the Rollercoin page and make sure you are logged in.',
    errorNoData: 'No data found. Go to Rollercoin and log in.',
    errorLoading: 'Error loading data',
    dataLoading: 'Loading data...',
    dropdownNotOpen: 'Please click on your power value on the game page to open the dropdown, then click Refresh.',
    openDropdownHint: 'Open power dropdown',
    notOnGamePage: 'Go to Rollercoin to get current data',
    cachedData: 'Showing cached data',
    waitingForData: 'Waiting for data...',
    goToGamePage: 'Go to Game Page',
    firstTimeSetup: 'First-Time Setup Required',
    firstTimeSetupDesc: 'Visit the league page to load block rewards. Values will be saved automatically.',
    pleaseRefresh: 'Please refresh the page',
    pleaseRefreshDesc: 'We need to inject our script to capture data. Please refresh the page once.',
    partialBlockRewards: '{count}/{total} coins updated',
    partialBlockRewardsDesc: 'Visit the league page to get all coin block rewards.',

    // Fiat currencies
    fiatUSDT: 'USD Tether',
    fiatTRY: 'Turkish Lira',
    fiatEUR: 'Euro',
    fiatGBP: 'British Pound',
    fiatRUB: 'Russian Ruble',
    fiatBRL: 'Brazilian Real',

    // Settings
    settings: 'Settings',
    settingsTitle: 'Minimum Withdrawal Limits',
    settingsDesc: 'Set minimum withdrawal amount for each coin',
    save: 'Save',
    cancel: 'Cancel',
    resetDefaults: 'Reset to Defaults',
    settingsSaved: 'Settings saved',

    // Block Reward Settings - DEPRECATED/REMOVED

    goToLeaguePage: 'Go to League Page',
    leaguePageHint: 'Visit the league page to see your league\'s block rewards',
    autoUpdated: 'Auto-updated from league page',
  },
};

export type TranslationKey = keyof typeof translations.tr;

export function t(key: TranslationKey, lang: Language): string {
  return translations[lang][key] || translations.en[key] || key;
}

export const SUPPORTED_LANGUAGES: { code: Language; name: string; flag: string }[] = [
  { code: 'tr', name: 'Türkçe', flag: 'TR' },
  { code: 'en', name: 'English', flag: 'EN' },
];

export const LANGUAGE_NAMES: Record<Language, string> = {
  tr: 'Türkçe',
  en: 'English',
};
