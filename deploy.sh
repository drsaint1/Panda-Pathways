#!/bin/bash

# Panda Pathways - Stellar Contract Deployment Script
# This script deploys all three smart contracts to Stellar testnet

set -e

echo "🐼 Panda Pathways - Contract Deployment Script"
echo "=============================================="
echo ""

# Check if stellar CLI is installed
if ! command -v stellar &> /dev/null; then
    echo "❌ Stellar CLI not found. Please install it first:"
    echo "   cargo install --locked stellar-cli"
    exit 1
fi

# Configuration
NETWORK="testnet"
SOURCE_ACCOUNT="deployer"

echo "📋 Configuration:"
echo "   Network: $NETWORK"
echo "   Source Account: $SOURCE_ACCOUNT"
echo ""

# Check if source account exists
if ! stellar keys show $SOURCE_ACCOUNT &> /dev/null; then
    echo "⚠️  Source account '$SOURCE_ACCOUNT' not found."
    echo "   Creating new account..."
    stellar keys generate --network $NETWORK $SOURCE_ACCOUNT
    echo "   ✅ Account created!"
    echo ""
    echo "   Funding account with testnet XLM..."
    stellar keys fund $SOURCE_ACCOUNT --network $NETWORK
    echo "   ✅ Account funded!"
    echo ""
fi

# Build contracts
echo "🔨 Building smart contracts..."
echo ""

echo "   Building panda-token..."
cd contracts/panda-token
cargo build --target wasm32-unknown-unknown --release
cd ../..
echo "   ✅ panda-token built"

echo "   Building panda-nft..."
cd contracts/panda-nft
cargo build --target wasm32-unknown-unknown --release
cd ../..
echo "   ✅ panda-nft built"

echo "   Building game-rewards..."
cd contracts/game-rewards
cargo build --target wasm32-unknown-unknown --release
cd ../..
echo "   ✅ game-rewards built"
echo ""

# Deploy contracts
echo "🚀 Deploying contracts to $NETWORK..."
echo ""

echo "   Deploying panda-token..."
PANDA_TOKEN_ID=$(stellar contract deploy \
  --wasm contracts/panda-token/target/wasm32-unknown-unknown/release/panda_token.wasm \
  --source $SOURCE_ACCOUNT \
  --network $NETWORK)
echo "   ✅ Panda Token deployed: $PANDA_TOKEN_ID"
echo ""

echo "   Deploying panda-nft..."
PANDA_NFT_ID=$(stellar contract deploy \
  --wasm contracts/panda-nft/target/wasm32-unknown-unknown/release/panda_nft.wasm \
  --source $SOURCE_ACCOUNT \
  --network $NETWORK)
echo "   ✅ Panda NFT deployed: $PANDA_NFT_ID"
echo ""

echo "   Deploying game-rewards..."
GAME_REWARDS_ID=$(stellar contract deploy \
  --wasm contracts/game-rewards/target/wasm32-unknown-unknown/release/game_rewards.wasm \
  --source $SOURCE_ACCOUNT \
  --network $NETWORK)
echo "   ✅ Game Rewards deployed: $GAME_REWARDS_ID"
echo ""

# Get deployer public key
DEPLOYER_KEY=$(stellar keys show $SOURCE_ACCOUNT)

# Initialize contracts
echo "🔧 Initializing contracts..."
echo ""

echo "   Initializing panda-token..."
stellar contract invoke \
  --id $PANDA_TOKEN_ID \
  --source $SOURCE_ACCOUNT \
  --network $NETWORK \
  -- initialize --admin $DEPLOYER_KEY
echo "   ✅ Panda Token initialized"
echo ""

echo "   Initializing panda-nft..."
stellar contract invoke \
  --id $PANDA_NFT_ID \
  --source $SOURCE_ACCOUNT \
  --network $NETWORK \
  -- initialize --admin $DEPLOYER_KEY
echo "   ✅ Panda NFT initialized"
echo ""

echo "   Initializing game-rewards..."
stellar contract invoke \
  --id $GAME_REWARDS_ID \
  --source $SOURCE_ACCOUNT \
  --network $NETWORK \
  -- initialize \
  --admin $DEPLOYER_KEY \
  --token_address $PANDA_TOKEN_ID \
  --nft_address $PANDA_NFT_ID
echo "   ✅ Game Rewards initialized"
echo ""

# Save deployment info
echo "📝 Saving deployment information..."
cat > deployment-info.txt << EOF
Panda Pathways - Deployment Information
========================================

Network: $NETWORK
Deployed: $(date)
Deployer: $DEPLOYER_KEY

Contract Addresses:
-------------------
Panda Token:    $PANDA_TOKEN_ID
Panda NFT:      $PANDA_NFT_ID
Game Rewards:   $GAME_REWARDS_ID

Environment Variables:
----------------------
VITE_PANDA_TOKEN_CONTRACT=$PANDA_TOKEN_ID
VITE_PANDA_NFT_CONTRACT=$PANDA_NFT_ID
VITE_GAME_REWARDS_CONTRACT=$GAME_REWARDS_ID

Next Steps:
-----------
1. Update .env file with contract addresses above
2. Update src/store/walletStore.ts with contract addresses
3. Run 'npm run dev' to test the application
4. Deploy frontend to production

EOF

echo "   ✅ Deployment info saved to deployment-info.txt"
echo ""

echo "🎉 Deployment Complete!"
echo ""
echo "📋 Contract Addresses:"
echo "   Panda Token:    $PANDA_TOKEN_ID"
echo "   Panda NFT:      $PANDA_NFT_ID"
echo "   Game Rewards:   $GAME_REWARDS_ID"
echo ""
echo "⚠️  IMPORTANT: Update the contract addresses in:"
echo "   1. .env file"
echo "   2. src/store/walletStore.ts"
echo ""
echo "🚀 Ready to play! Run: npm run dev"
