# 🐼 Panda Pathways

> A blockchain-powered 3D endless runner game on Stellar where players mint unique Panda NFTs, compete for high scores, earn PANDA tokens as rewards, and stake their NFTs for future benefits.

![Stellar](https://img.shields.io/badge/Stellar-Soroban-blue)
![React](https://img.shields.io/badge/React-18.2.0-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.3.3-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## 🎮 Game Features

- **3D Endless Runner**: Sprint through bamboo forests, dodge obstacles, and build combos
- **NFT Integration**: Mint up to 5 unique Panda NFTs with different skins
- **Play-to-Earn**: Earn PANDA tokens based on your score and combo performance
- **NFT Staking**: Stake your Pandas to unlock future rewards
- **Leaderboard**: Compete with players worldwide
- **Web3 Gaming**: Full blockchain integration with Stellar network

## 🌟 Live Demo

[Play Panda Pathways](#) *(Add your deployment URL)*

## 📋 Table of Contents

- [Features](#features)
- [Technology Stack](#technology-stack)
- [Smart Contracts](#smart-contracts)
- [Installation](#installation)
- [Development](#development)
- [Deployment](#deployment)
- [Game Controls](#game-controls)
- [Architecture](#architecture)
- [Contributing](#contributing)
- [License](#license)

## ✨ Features

### 🎨 NFT System
- **6 Unique Panda Skins**: Bamboo Scout, Aurora Glide, Ember Dash, Golden Fur, Samurai Spirit, Festival
- **On-Chain Metadata**: All NFT data stored on Stellar blockchain
- **Limited Supply**: Maximum 5 NFTs per wallet
- **Staking Mechanism**: Stake NFTs to earn future rewards

### 🎮 Gameplay
- **Dynamic Difficulty**: Game speed increases as you progress
- **Combo System**: Build combos for bonus rewards
- **Multiple Obstacles**: Rocks, trees, and pits to avoid
- **Score Tracking**: Persistent leaderboard on-chain

### 💰 Tokenomics
- **PANDA Token**: Native reward token (7 decimals)
- **Score-Based Rewards**: Earn tokens based on performance
- **Combo Bonuses**: Extra tokens for maintaining combos
- **Blockchain Verified**: All rewards recorded on Stellar

## 🛠 Technology Stack

### Frontend
- **React 18.2** - UI framework
- **TypeScript 5.3** - Type-safe development
- **Vite 5.0** - Fast build tool
- **THREE.js** - 3D game rendering
- **Zustand** - State management
- **Stellar Wallet Kit** - Wallet integration

### Blockchain
- **Stellar Soroban** - Smart contract platform
- **Rust** - Contract language
- **WebAssembly** - Contract compilation target
- **Stellar SDK 11.3** - Blockchain interaction

### Smart Contracts
- **panda-token** - Fungible token contract
- **panda-nft** - NFT minting and staking
- **game-rewards** - Score tracking and rewards

## 📜 Smart Contracts

### Deployed Contracts (Testnet)

| Contract | Address | Description |
|----------|---------|-------------|
| **PANDA Token** | `CBQJEQG56OIADIR5DFOQQRBQXXNGAICAFP7QDXOAEC3YPHEPX5YFMJB6` | Fungible reward token |
| **Panda NFT** | `CCOT7KDAK6YRGUR3ZJYX3POWSXA3KQSDS6PNLA64W6VKNSIEE33COCBF` | NFT minting & staking |
| **Game Rewards** | `CDGZ3PJ3XXERQGZTJ3SUGAVBQWXP72HHMYERGFLLZ3HSK5NMBL32SE7L` | Score submission & rewards |

### Contract Functions

#### PANDA Token
```rust
initialize(admin: Address)
mint(to: Address, amount: i128)
transfer(from: Address, to: Address, amount: i128)
balance(id: Address) -> i128
```

#### Panda NFT
```rust
initialize(admin: Address)
mint_panda(player: Address, skin: String) -> u64
stake(token_id: u64)
unstake(token_id: u64)
get_player_pandas(player: Address) -> Vec<u64>
get_staked_pandas(player: Address) -> Vec<u64>
```

#### Game Rewards
```rust
initialize(admin: Address, token_address: Address, nft_address: Address)
submit_score(player: Address, score: i128, distance: i128, combo: u32, panda_nft_id: Option<u64>) -> i128
get_player_scores(player: Address) -> Vec<GameScore>
```

## 🚀 Installation

### Prerequisites
- Node.js 18+ and npm
- Rust and Cargo
- Stellar CLI
- Docker (optional, for local Stellar network)

### Clone the Repository
```bash
git clone https://github.com/yourusername/panda-pathways.git
cd panda-pathways
```

### Install Dependencies
```bash
npm install
```

### Configure Environment
Create a `.env` file in the root directory:

```env
# Stellar Network Configuration
VITE_STELLAR_NETWORK=TESTNET

# Deployed Contract Addresses (Testnet)
VITE_PANDA_TOKEN_CONTRACT=CBQJEQG56OIADIR5DFOQQRBQXXNGAICAFP7QDXOAEC3YPHEPX5YFMJB6
VITE_PANDA_NFT_CONTRACT=CCOT7KDAK6YRGUR3ZJYX3POWSXA3KQSDS6PNLA64W6VKNSIEE33COCBF
VITE_GAME_REWARDS_CONTRACT=CDGZ3PJ3XXERQGZTJ3SUGAVBQWXP72HHMYERGFLLZ3HSK5NMBL32SE7L

# Deployer Account (for reference)
DEPLOYER_ADDRESS=YOUR_DEPLOYER_ADDRESS
```

## 💻 Development

### Start Development Server
```bash
npm run dev
```
The app will be available at `http://localhost:5173`

### Build Contracts
```bash
# Build all contracts
cd contracts/panda-token
stellar contract build

cd ../panda-nft
stellar contract build

cd ../game-rewards
stellar contract build
```

### Deploy Contracts
```bash
# Deploy panda-token
stellar contract deploy \
  --wasm target/wasm32v1-none/release/panda_token.wasm \
  --source deployer \
  --network testnet

# Initialize contract
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source deployer \
  --network testnet \
  -- initialize --admin <YOUR_ADDRESS>
```

### Build for Production
```bash
npm run build
```
Production files will be in the `dist/` directory.

## 🎮 Game Controls

| Key | Action |
|-----|--------|
| **← / A** | Move Left |
| **→ / D** | Move Right |
| **Space / W** | Jump |
| **Shift / S** | Crouch |

## 🏗 Architecture

```
panda-pathways/
├── contracts/              # Smart contracts
│   ├── panda-token/       # Fungible token
│   ├── panda-nft/         # NFT minting & staking
│   └── game-rewards/      # Score & rewards
├── src/
│   ├── components/        # React components
│   │   ├── GameCanvas.tsx
│   │   ├── PandaNFTMint.tsx
│   │   ├── PandaStake.tsx
│   │   ├── Leaderboard.tsx
│   │   └── WalletConnect.tsx
│   ├── game/              # Game engine
│   │   └── Game.ts        # THREE.js game logic
│   ├── store/             # State management
│   │   └── walletStore.ts # Zustand store
│   ├── config/            # Configuration
│   │   └── stellar.ts     # Network config
│   └── App.tsx            # Main app
└── dist/                  # Production build
```

## 🎯 How to Play

1. **Connect Wallet**: Click "Connect Wallet" and choose Freighter or other Stellar wallet
2. **Mint NFT**: Mint your first Panda NFT (choose from 6 skins)
3. **Play Game**: Use arrow keys or WASD to dodge obstacles
4. **Earn Tokens**: Higher scores and combos = more PANDA tokens
5. **Save Score**: Submit your score to the blockchain to claim rewards
6. **Stake NFTs**: Stake your Pandas for future benefits

## 🏆 Scoring System

- **Base Reward**: `(score × 1,000,000) / 10,000,000` PANDA
- **Combo Bonus**: `(best_combo × 5,000,000) / 10,000,000` PANDA
- **Total Reward**: Base + Combo Bonus

Example: Score of 1000 with 10x combo = **0.60 PANDA tokens**

## 🔐 Security

- All transactions require wallet signature
- Smart contracts audited for common vulnerabilities
- No private keys stored in frontend
- Cross-contract authentication implemented

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [Scaffold Stellar](https://scaffoldstellar.org/)
- Powered by [Stellar](https://stellar.org/)
- Uses [Stellar Wallet Kit](https://github.com/Creit-Tech/Stellar-Wallets-Kit)
- Game engine built with [THREE.js](https://threejs.org/)

## 📞 Support

- **Documentation**: See [DOCUMENTATION.md](DOCUMENTATION.md)
- **Issues**: [GitHub Issues](https://github.com/yourusername/panda-pathways/issues)
- **Discord**: [Join our community](#)
- **Email**: support@pandapathways.com

## 🗺 Roadmap

- [ ] Mainnet deployment
- [ ] Multiplayer races
- [ ] NFT marketplace integration
- [ ] Mobile app (React Native)
- [ ] Additional game modes
- [ ] Tournament system
- [ ] Governance token

---

**Made with ❤️ for the Stellar ecosystem**
