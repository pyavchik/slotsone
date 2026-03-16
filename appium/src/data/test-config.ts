export const TEST_CONFIG = {
  baseUrl: process.env.BASE_URL || 'https://pyavchik.space',
  apiBaseUrl: process.env.BASE_URL
    ? `${process.env.BASE_URL}/api/v1`
    : 'https://pyavchik.space/api/v1',

  timeouts: {
    pageLoad: 15000,
    element: 15000,
    spin: 15000,
    animation: 5000,
    navigation: 10000,
  },

  paths: {
    landing: '/',
    login: '/login',
    register: '/register',
    lobby: '/slots',
    history: '/history',
    megaFortune: '/slots/mega-fortune',
    europeanRoulette: '/slots/european-roulette',
    americanRoulette: '/slots/american-roulette',
  },
} as const;
