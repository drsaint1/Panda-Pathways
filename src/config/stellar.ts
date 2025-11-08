/**
 * Stellar Network Configuration
 *
 * IMPORTANT: This app uses TESTNET for development and hackathon demo
 * DO NOT change to MAINNET unless deploying to production with real assets
 */

type StellarNetwork = 'TESTNET' | 'MAINNET';

const ENV_NETWORK = (import.meta.env.VITE_STELLAR_NETWORK?.toUpperCase() as StellarNetwork) || 'TESTNET';
const NETWORK: StellarNetwork = ENV_NETWORK === 'MAINNET' ? 'MAINNET' : 'TESTNET';

interface StellarConfig {
  NETWORK: StellarNetwork;
  HORIZON_URL: string;
  NETWORK_PASSPHRASE: string;
  FRIENDBOT_URL: string;
  CONTRACTS: {
    PANDA_TOKEN: string;
    PANDA_NFT: string;
    GAME_REWARDS: string;
  };
}

export const STELLAR_CONFIG: StellarConfig = {
  NETWORK,

  HORIZON_URL: 'https://soroban-testnet.stellar.org',

  NETWORK_PASSPHRASE: 'Test SDF Network ; September 2015',

  FRIENDBOT_URL: 'https://friendbot.stellar.org',

  CONTRACTS: {
    PANDA_TOKEN: import.meta.env.VITE_PANDA_TOKEN_CONTRACT || '',
    PANDA_NFT: import.meta.env.VITE_PANDA_NFT_CONTRACT || '',
    GAME_REWARDS: import.meta.env.VITE_GAME_REWARDS_CONTRACT || '',
  },
} as const;

export function getNetworkPassphrase(): string {
  return STELLAR_CONFIG.NETWORK_PASSPHRASE;
}

export function isTestnet(): boolean {
  return STELLAR_CONFIG.NETWORK === 'TESTNET';
}

if (STELLAR_CONFIG.NETWORK === 'MAINNET') {
  console.warn(
    '⚠️ WARNING: MAINNET configuration detected! ' +
    'This should only be used in production with real assets.'
  );
}

console.log(`🌐 Stellar Network: ${STELLAR_CONFIG.NETWORK}`);
console.log(`📡 Horizon URL: ${STELLAR_CONFIG.HORIZON_URL}`);
