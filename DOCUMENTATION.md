# 📚 Panda Pathways - Technical Documentation

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Smart Contracts](#smart-contracts)
3. [Frontend Architecture](#frontend-architecture)
4. [Game Engine](#game-engine)
5. [State Management](#state-management)
6. [Wallet Integration](#wallet-integration)
7. [Deployment Guide](#deployment-guide)
8. [API Reference](#api-reference)
9. [Troubleshooting](#troubleshooting)

---

## Architecture Overview

### System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Frontend (React)                    │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │   Game   │  │   NFT    │  │  Stake   │             │
│  │  Canvas  │  │   Mint   │  │   Page   │             │
│  └──────────┘  └──────────┘  └──────────┘             │
│         │              │              │                  │
│         └──────────────┴──────────────┘                  │
│                        │                                  │
│                   Wallet Store                           │
│                        │                                  │
└────────────────────────┼──────────────────────────────────┘
                         │
                         │ Stellar SDK
                         │
┌────────────────────────┼──────────────────────────────────┐
│               Stellar Network (Testnet)                   │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐         │
│  │   PANDA    │  │   Panda    │  │    Game    │         │
│  │   Token    │  │    NFT     │  │  Rewards   │         │
│  └────────────┘  └────────────┘  └────────────┘         │
└───────────────────────────────────────────────────────────┘
```

### Technology Stack

**Frontend**
- React 18.2 with TypeScript
- Vite for fast development and building
- THREE.js for 3D rendering
- Zustand for state management
- Stellar Wallet Kit for wallet connections

**Smart Contracts**
- Soroban (Stellar's smart contract platform)
- Rust programming language
- WebAssembly compilation target

---

## Smart Contracts

### 1. Panda Token Contract

**Location**: `contracts/panda-token/src/lib.rs`

**Purpose**: Fungible token for in-game rewards

**Data Structure**:
```rust
pub enum DataKey {
    Admin,
    Initialized,
    Balances,
    Minters,
}
```

**Key Functions**:

#### `initialize(env: Env, admin: Address)`
Initializes the token contract with an admin.

**Parameters**:
- `admin`: The address that will have administrative privileges

**Events**: None

---

#### `mint(env: Env, to: Address, amount: i128)`
Mints new tokens to a specified address. No authentication required to allow cross-contract calls.

**Parameters**:
- `to`: Recipient address
- `amount`: Amount in stroops (1 PANDA = 10,000,000 stroops)

**Note**: Authentication is handled by the calling contract (game-rewards)

---

#### `transfer(env: Env, from: Address, to: Address, amount: i128)`
Transfers tokens between addresses.

**Parameters**:
- `from`: Sender address (must sign transaction)
- `to`: Recipient address
- `amount`: Amount to transfer

**Panics**: If insufficient balance

---

#### `balance(env: Env, id: Address) -> i128`
Returns the token balance for an address.

**Returns**: Balance in stroops

---

### 2. Panda NFT Contract

**Location**: `contracts/panda-nft/src/lib.rs`

**Purpose**: NFT minting, management, and staking

**Data Structures**:
```rust
pub struct PandaNFT {
    pub token_id: u64,
    pub owner: Address,
    pub skin: String,
    pub minted_at: u64,
    pub games_played: u32,
    pub total_score: i128,
    pub is_staked: bool,
    pub staked_at: u64,
}

pub enum DataKey {
    Admin,
    TokenCounter,
    Tokens(u64),
    PlayerTokens(Address),
    TotalSupply,
    StakedTokens(Address),
    StakedCount(Address),
}
```

**Available Skins**:
1. `bamboo` - Bamboo Scout
2. `aurora` - Aurora Glide
3. `ember` - Ember Dash
4. `golden` - Golden Fur
5. `samurai` - Samurai Spirit
6. `festival` - Festival

**Key Functions**:

#### `mint_panda(env: Env, player: Address, skin: String) -> u64`
Mints a new Panda NFT.

**Parameters**:
- `player`: Address to receive the NFT
- `skin`: Skin identifier (see Available Skins)

**Returns**: Token ID of minted NFT

**Restrictions**:
- Maximum 5 NFTs per wallet
- Player must authorize transaction

---

#### `stake(env: Env, token_id: u64)`
Stakes an NFT to earn future rewards.

**Parameters**:
- `token_id`: ID of the NFT to stake

**Requirements**:
- Caller must own the NFT
- NFT must not already be staked

**Effects**:
- Sets `is_staked = true`
- Records `staked_at` timestamp
- Adds to staked tokens list

---

#### `unstake(env: Env, token_id: u64)`
Unstakes an NFT.

**Parameters**:
- `token_id`: ID of the NFT to unstake

**Requirements**:
- Caller must own the NFT
- NFT must be currently staked

---

#### `get_player_pandas(env: Env, player: Address) -> Vec<u64>`
Returns all NFT IDs owned by a player.

---

#### `get_staked_pandas(env: Env, player: Address) -> Vec<u64>`
Returns all staked NFT IDs for a player.

---

#### `get_staking_duration(env: Env, token_id: u64) -> u64`
Returns how long an NFT has been staked (in seconds).

---

### 3. Game Rewards Contract

**Location**: `contracts/game-rewards/src/lib.rs`

**Purpose**: Score tracking and reward distribution

**Data Structures**:
```rust
pub struct GameScore {
    pub player: Address,
    pub score: i128,
    pub distance: i128,
    pub combo: u32,
    pub timestamp: u64,
    pub panda_nft_id: Option<u64>,
}

pub enum DataKey {
    Admin,
    TokenAddress,
    NFTAddress,
    RewardRate,
    PlayerScores(Address),
    TotalGamesPlayed,
}
```

**Reward Formula**:
```rust
const BASE_REWARD_MULTIPLIER: i128 = 1_000_000;
const COMBO_BONUS_MULTIPLIER: i128 = 5_000_000;

total_reward = (score × BASE_REWARD_MULTIPLIER) + (combo × COMBO_BONUS_MULTIPLIER)
```

**Key Functions**:

#### `submit_score(env: Env, player: Address, score: i128, distance: i128, combo: u32, panda_nft_id: Option<u64>) -> i128`
Submits a score and distributes rewards.

**Parameters**:
- `player`: Player's address
- `score`: Final score
- `distance`: Distance traveled
- `combo`: Best combo achieved
- `panda_nft_id`: Optional NFT ID used

**Returns**: Total reward amount

**Process**:
1. Validates player authorization
2. Calculates rewards based on formula
3. Records score on-chain
4. Mints PANDA tokens via cross-contract call
5. Returns reward amount

---

## Frontend Architecture

### Component Structure

```
src/
├── components/
│   ├── GameCanvas.tsx          # Main game component
│   ├── PandaNFTMint.tsx        # NFT minting modal
│   ├── PandaStake.tsx          # Staking interface
│   ├── Leaderboard.tsx         # Score display
│   ├── WalletConnect.tsx       # Wallet connection
│   └── TransactionNotification.tsx  # Toast notifications
├── game/
│   └── Game.ts                 # THREE.js game engine
├── store/
│   └── walletStore.ts          # Zustand state management
└── config/
    └── stellar.ts              # Network configuration
```

### Key Components

#### GameCanvas Component

**File**: `src/components/GameCanvas.tsx`

**Purpose**: Renders the 3D game and handles gameplay

**Props**:
```typescript
interface GameCanvasProps {
  selectedPandaNFT: number | null;
  gameStarted: boolean;
  onStartGame: (nftId?: number) => void;
}
```

**State**:
```typescript
const [currentScore, setCurrentScore] = useState<ScoreState | null>(null);
const [showPrompt, setShowPrompt] = useState(true);
const [currentSkin, setCurrentSkin] = useState<SkinName>('bamboo');
const [isSubmitting, setIsSubmitting] = useState(false);
const [rewardEarned, setRewardEarned] = useState<number>(0);
const [scoreSaved, setScoreSaved] = useState(false);
```

**Key Functions**:
- `handleStartClick()`: Validates NFT ownership and starts game
- `handleSaveScore()`: Submits score to blockchain
- `toHex()`: Converts color values for display

---

#### PandaNFTMint Component

**File**: `src/components/PandaNFTMint.tsx`

**Purpose**: NFT minting interface with skin selection

**Features**:
- Skin preview with color swatches
- Maximum supply validation (5 NFTs/wallet)
- Transaction status notifications
- Auto-close on first mint

---

#### PandaStake Component

**File**: `src/components/PandaStake.tsx`

**Purpose**: NFT staking management

**Features**:
- Display owned and staked NFTs
- Stake/unstake buttons with loading states
- Real-time status updates
- Transaction notifications

---

## Game Engine

### Game.ts Architecture

**File**: `src/game/Game.ts`

**Core Technologies**:
- THREE.js for 3D rendering
- Custom physics and collision detection
- Dynamic difficulty scaling

**Main Classes**:

#### Game Class

**Constructor**:
```typescript
constructor({
  canvas: HTMLCanvasElement,
  callbacks: {
    onScore: (score: ScoreState) => void,
    onGameOver: (score: ScoreState) => void,
    onSkinChange: (skin: SkinName) => void
  }
})
```

**Key Methods**:

##### `start()`
Initializes and starts the game loop.

**Process**:
1. Creates panda mesh
2. Spawns initial obstacles
3. Sets up camera
4. Starts render loop

---

##### `update(deltaTime: number)`
Updates game state each frame.

**Updates**:
- Panda position
- Obstacle positions
- Camera follow
- Collision detection
- Score calculation

---

##### `checkCollisions()`
Detects collisions between panda and obstacles.

**Collision Types**:
- **Rock**: `y > -0.5`
- **Tree**: `y > -0.5`
- **Pit**: `y < -0.2`

**On Collision**:
- Ends game
- Triggers `onGameOver` callback
- Displays final score

---

##### `applySkin(skinName: SkinName)`
Changes the panda's appearance.

**Parameters**:
- `skinName`: One of the 6 available skins

**Effects**:
- Updates panda material colors
- Triggers `onSkinChange` callback

---

### Skin System

**Color Palette**:
```typescript
export const SKIN_PALETTE = {
  bamboo: { base: 0xf5e6d3, accent: 0x3a3a3a, boot: 0x4a4a4a },
  aurora: { base: 0xe8f4f8, accent: 0x5a7d99, boot: 0x2a3744 },
  ember: { base: 0xfde8e8, accent: 0xd17a7a, boot: 0x8b4545 },
  golden: { base: 0xffd700, accent: 0xff8c00, boot: 0x8b4513 },
  samurai: { base: 0xffefd5, accent: 0xdc143c, boot: 0x8b0000 },
  festival: { base: 0xffe4e1, accent: 0xff69b4, boot: 0xc71585 }
};
```

---

## State Management

### Wallet Store (Zustand)

**File**: `src/store/walletStore.ts`

**State Interface**:
```typescript
interface WalletState {
  isConnected: boolean;
  publicKey: string | null;
  network: 'TESTNET' | 'MAINNET';
  balance: string;
  pandaTokenBalance: string;
  ownedPandaNFTs: number[];
  selectedWalletId: string | null;
  stakedPandaNFTs: number[];

  // Actions
  connect: () => Promise<void>;
  disconnect: () => void;
  fetchBalances: () => Promise<void>;
  fetchPandaNFTs: () => Promise<void>;
  submitScore: (score: number, distance: number, combo: number, nftId?: number) => Promise<string>;
  mintPandaNFT: (skin: string) => Promise<number>;
  stakePandaNFT: (pandaId: number) => Promise<string>;
  unstakePandaNFT: (pandaId: number) => Promise<string>;
}
```

### Key Store Functions

#### `connect()`
Opens Stellar Wallet Kit modal and connects wallet.

**Process**:
1. Initializes Stellar Wallet Kit
2. Gets available wallets
3. Opens selection modal
4. Stores public key and wallet ID
5. Fetches balances and NFTs

---

#### `submitScore(score, distance, combo, nftId?)`
Submits score to game-rewards contract.

**Parameters**:
- `score`: Final score
- `distance`: Distance traveled
- `combo`: Best combo
- `nftId`: Optional NFT ID

**Returns**: Transaction hash

**Process**:
1. Builds transaction
2. Simulates transaction
3. Gets wallet signature
4. Submits to network
5. Polls for confirmation
6. Returns tx hash

---

#### `mintPandaNFT(skin)`
Mints a new Panda NFT.

**Parameters**:
- `skin`: Skin identifier

**Returns**: Token ID

**Process**:
1. Validates max supply (5)
2. Builds mint transaction
3. Gets wallet signature
4. Submits to network
5. Waits for confirmation
6. Refreshes NFT list
7. Returns token ID

---

#### `stakePandaNFT(pandaId)`
Stakes an NFT.

**Parameters**:
- `pandaId`: NFT token ID

**Returns**: Transaction hash

**Error Handling**:
- Throws if NFT not owned
- Throws if already staked
- Throws if wallet not connected

---

## Wallet Integration

### Stellar Wallet Kit Setup

**File**: `src/store/walletStore.ts`

**Initialization**:
```typescript
import { StellarWalletsKit, WalletNetwork } from '@creit.tech/stellar-wallets-kit';

const walletKit = new StellarWalletsKit({
  network: WalletNetwork.TESTNET,
  selectedWalletId: FREIGHTER_ID,
  modules: allowAllModules()
});
```

### Supported Wallets

1. **Freighter** (Default)
2. **xBull**
3. **Albedo**
4. **Rabet**

### Transaction Signing Flow

```typescript
// 1. Build transaction
const transaction = new StellarSdk.TransactionBuilder(account, {...})
  .addOperation(operation)
  .setTimeout(180)
  .build();

// 2. Prepare transaction
const prepared = await server.prepareTransaction(transaction);

// 3. Get signature
const { signedTxXdr } = await kit.signTransaction(prepared.toXDR(), {
  address: publicKey,
  networkPassphrase: NETWORK_PASSPHRASE
});

// 4. Submit
const signedTx = StellarSdk.TransactionBuilder.fromXDR(signedTxXdr, NETWORK_PASSPHRASE);
const result = await server.sendTransaction(signedTx);
```

---

## Deployment Guide

### Contract Deployment

#### 1. Build Contracts
```bash
cd contracts/panda-token
stellar contract build

cd ../panda-nft
stellar contract build

cd ../game-rewards
stellar contract build
```

#### 2. Deploy to Testnet
```bash
# Deploy panda-token
stellar contract deploy \
  --wasm target/wasm32v1-none/release/panda_token.wasm \
  --source deployer \
  --network testnet
```

#### 3. Initialize Contracts
```bash
# Initialize panda-token
stellar contract invoke \
  --id <TOKEN_CONTRACT_ID> \
  --source deployer \
  --network testnet \
  -- initialize --admin <YOUR_ADDRESS>

# Initialize panda-nft
stellar contract invoke \
  --id <NFT_CONTRACT_ID> \
  --source deployer \
  --network testnet \
  -- initialize --admin <YOUR_ADDRESS>

# Initialize game-rewards
stellar contract invoke \
  --id <REWARDS_CONTRACT_ID> \
  --source deployer \
  --network testnet \
  -- initialize \
  --admin <YOUR_ADDRESS> \
  --token_address <TOKEN_CONTRACT_ID> \
  --nft_address <NFT_CONTRACT_ID>
```

#### 4. Update .env
```env
VITE_PANDA_TOKEN_CONTRACT=<TOKEN_CONTRACT_ID>
VITE_PANDA_NFT_CONTRACT=<NFT_CONTRACT_ID>
VITE_GAME_REWARDS_CONTRACT=<REWARDS_CONTRACT_ID>
```

### Frontend Deployment

#### Build
```bash
npm run build
```

#### Deploy Options

**Vercel**:
```bash
vercel --prod
```

**Netlify**:
```bash
netlify deploy --prod --dir=dist
```

**GitHub Pages**:
```bash
npm run build
gh-pages -d dist
```

---

## API Reference

### Stellar SDK Methods Used

#### Contract Invocation
```typescript
const contract = new StellarSdk.Contract(contractId);
const operation = contract.call('function_name', ...args);
```

#### Transaction Building
```typescript
const transaction = new StellarSdk.TransactionBuilder(account, {
  fee: StellarSdk.BASE_FEE,
  networkPassphrase: StellarSdk.Networks.TESTNET
})
  .addOperation(operation)
  .setTimeout(180)
  .build();
```

#### Value Conversion
```typescript
// To ScVal
StellarSdk.nativeToScVal(value, { type: 'u64' })
StellarSdk.nativeToScVal(address, { type: 'address' })

// From ScVal
StellarSdk.scValToNative(scVal)
```

---

## Troubleshooting

### Common Issues

#### 1. Transaction Timeout
**Problem**: "Transaction not found" after 5 seconds

**Solution**:
- Increase timeout in walletStore.ts
- Check network status
- Verify contract addresses

#### 2. BigInt Conversion Errors
**Problem**: NFT IDs showing as 0n, 1n instead of 0, 1

**Solution**: Already handled in `fetchPandaNFTs()`:
```typescript
const rawIds = StellarSdk.scValToNative(result);
const nftIds = rawIds.map(id => typeof id === 'bigint' ? Number(id) : id);
```

#### 3. Wallet Not Detected
**Problem**: "No wallets available"

**Solution**:
- Install Freighter extension
- Refresh page
- Check browser console

#### 4. Authorization Errors
**Problem**: `Error(Auth, InvalidAction)`

**Solution**:
- Verify wallet is connected
- Check transaction signer matches expected address
- Ensure cross-contract auth is properly configured

### Debug Mode

Enable detailed logging:
```typescript
// In walletStore.ts
console.log('Transaction XDR:', transaction.toXDR());
console.log('Simulation result:', simulated);
console.log('TX Hash:', result.hash);
```

---

## Performance Optimization

### Frontend
- Code splitting with dynamic imports
- Lazy load THREE.js assets
- Memoize expensive computations
- Use React.memo for static components

### Smart Contracts
- Minimize storage operations
- Batch operations where possible
- Use persistent storage efficiently
- Optimize data structures

---

## Security Considerations

### Smart Contracts
- ✅ No reentrancy vulnerabilities
- ✅ Integer overflow protection (Rust)
- ✅ Access control on admin functions
- ✅ Input validation

### Frontend
- ✅ No private key storage
- ✅ All transactions require user signature
- ✅ HTTPS only
- ✅ Input sanitization

---

**For additional support, see [README.md](README.md) or open an issue on GitHub.**
