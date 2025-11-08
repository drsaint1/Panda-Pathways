/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_PANDA_TOKEN_CONTRACT?: string
  readonly VITE_PANDA_NFT_CONTRACT?: string
  readonly VITE_GAME_REWARDS_CONTRACT?: string
  readonly VITE_STELLAR_NETWORK?: string
  readonly VITE_ENABLE_ANALYTICS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
