import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import * as StellarSdk from '@stellar/stellar-sdk';
import {
  StellarWalletsKit,
  WalletNetwork,
  allowAllModules,
  FREIGHTER_ID,
  ISupportedWallet,
} from '@creit.tech/stellar-wallets-kit';
import { STELLAR_CONFIG } from '../config/stellar';

const getSorobanServer = () => new StellarSdk.SorobanRpc.Server(STELLAR_CONFIG.HORIZON_URL);

let walletKit: StellarWalletsKit | null = null;

function getWalletKit(): StellarWalletsKit {
  if (!walletKit) {
    const network =
      STELLAR_CONFIG.NETWORK === 'TESTNET'
        ? WalletNetwork.TESTNET
        : WalletNetwork.PUBLIC;

    walletKit = new StellarWalletsKit({
      network,
      selectedWalletId: FREIGHTER_ID,
      modules: allowAllModules(),
    });

    console.log('✓ Stellar Wallets Kit initialized');
  }

  return walletKit;
}

export interface WalletState {
  isConnected: boolean;
  publicKey: string | null;
  network: 'TESTNET' | 'MAINNET';
  balance: string;
  pandaTokenBalance: string;
  ownedPandaNFTs: number[];
  selectedWalletId: string | null;
  stakedPandaNFTs: number[];
  connect: () => Promise<void>;
  disconnect: () => void;
  fetchBalances: () => Promise<void>;
  fetchPandaNFTs: () => Promise<void>;
  submitScore: (score: number, distance: number, combo: number, nftId?: number) => Promise<string>;
  mintPandaNFT: (skin: string) => Promise<number>;
  stakePandaNFT: (pandaId: number) => Promise<string>;
  unstakePandaNFT: (pandaId: number) => Promise<string>;
  autoReconnect: () => Promise<void>;
}

const useWalletStore = create<WalletState>()(
  persist(
    (set, get) => ({
      isConnected: false,
      publicKey: null,
      network: STELLAR_CONFIG.NETWORK,
      balance: '0',
      pandaTokenBalance: '0',
      ownedPandaNFTs: [],
      selectedWalletId: null,
      stakedPandaNFTs: [],

      connect: async () => {
    try {
      console.log('Opening Stellar Wallet Kit modal...');

      const kit = getWalletKit();
      const supportedWallets = await kit.getSupportedWallets();
      const availableWallets = supportedWallets.filter((wallet: ISupportedWallet) => wallet.isAvailable);

      if (availableWallets.length === 0) {
        throw new Error(
          'No supported Stellar wallets detected.\n\n' +
          'Install Freighter, xBull, Albedo, or another supported wallet and try again.'
        );
      }

      let completed = false;

      await new Promise<void>((resolve, reject) => {
        const finish = () => {
          if (!completed) {
            completed = true;
            resolve();
          }
        };

        const fail = (error: Error) => {
          if (!completed) {
            completed = true;
            reject(error);
          }
        };

        kit.openModal({
          modalTitle: 'Connect your Stellar wallet',
          onWalletSelected: (option) => {
            kit.setWallet(option.id);

            kit.getAddress()
              .then(({ address }) => {
                console.log('✓ Wallet connected:', `${address.substring(0, 8)}...`);

                set({
                  isConnected: true,
                  publicKey: address,
                  selectedWalletId: option.id,
                });

                get().fetchBalances().catch(console.error);
                get().fetchPandaNFTs().catch(console.error);

                finish();
              })
              .catch((error) => {
                console.error('Failed to fetch wallet address:', error);
                fail(error instanceof Error ? error : new Error('Failed to fetch wallet address'));
              });
          },
          onClosed: (err) => {
            if (err) {
              fail(err);
              return;
            }

            fail(new Error('Wallet connection cancelled'));
          },
        }).catch((error) => {
          fail(error instanceof Error ? error : new Error('Unable to open wallet selector'));
        });
      });

    } catch (error: any) {
      console.error('Wallet connection failed:', error);

      if (error.message?.includes('User declined') || error.message?.includes('User rejected')) {
        throw new Error('You declined the connection. Please try again and approve.');
      }

      if (error.message === 'Wallet connection cancelled') {
        throw new Error('Wallet connection cancelled.');
      }

      throw error;
    }
  },

  disconnect: () => {
    try {
      if (walletKit) {
        walletKit.disconnect().catch((err) => {
          console.warn('Wallet disconnect warning:', err);
        });
      }
    } catch (error) {
      console.warn('Wallet kit disconnect failed:', error);
    }

    set({
      isConnected: false,
      publicKey: null,
      balance: '0',
      pandaTokenBalance: '0',
      ownedPandaNFTs: [],
      selectedWalletId: null,
    });
  },

  autoReconnect: async () => {
    const { publicKey, selectedWalletId, isConnected } = get();

    // If already connected or no saved data, skip
    if (isConnected || !publicKey || !selectedWalletId) {
      return;
    }

    try {
      console.log('Attempting to restore wallet connection...');

      const kit = getWalletKit();
      kit.setWallet(selectedWalletId);

      // Try to get the current address from the wallet
      const { address } = await kit.getAddress();

      // Verify it matches the saved address
      if (address === publicKey) {
        console.log('✓ Wallet connection restored:', `${address.substring(0, 8)}...`);

        set({ isConnected: true });

        // Refresh balances and NFTs
        get().fetchBalances().catch(console.error);
        get().fetchPandaNFTs().catch(console.error);
      } else {
        console.warn('Wallet address mismatch, clearing saved connection');
        get().disconnect();
      }
    } catch (error) {
      console.warn('Auto-reconnect failed:', error);
      // Don't disconnect here, keep the data for manual reconnection
      set({ isConnected: false });
    }
  },

  fetchBalances: async () => {
    const { publicKey } = get();
    if (!publicKey) return;

    try {
      const horizonServer = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');
      const account = await horizonServer.loadAccount(publicKey);
      const xlmBalance = account.balances.find((b: any) => b.asset_type === 'native');

      const server = getSorobanServer();
      const pandaContract = new StellarSdk.Contract(STELLAR_CONFIG.CONTRACTS.PANDA_TOKEN);

      const operation = pandaContract.call(
        'balance',
        StellarSdk.nativeToScVal(publicKey, { type: 'address' })
      );

      const transaction = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: STELLAR_CONFIG.NETWORK_PASSPHRASE
      })
        .addOperation(operation)
        .setTimeout(30)
        .build();

      const simulated = await server.simulateTransaction(transaction);

      let pandaBalance = '0';
      if (StellarSdk.SorobanRpc.Api.isSimulationSuccess(simulated)) {
        const result = simulated.result?.retval;
        if (result) {
          try {
            const balanceStroops = StellarSdk.scValToNative(result);
            console.log('Raw balance from contract:', balanceStroops, 'Type:', typeof balanceStroops);

            let balanceNumber: number;
            if (typeof balanceStroops === 'bigint') {
              balanceNumber = Number(balanceStroops);
            } else if (typeof balanceStroops === 'number') {
              balanceNumber = balanceStroops;
            } else {
              console.warn('Unexpected balance type:', typeof balanceStroops);
              balanceNumber = 0;
            }

            pandaBalance = (balanceNumber / 10_000_000).toFixed(2);
            console.log('✅ PANDA balance:', pandaBalance, 'PANDA (from', balanceNumber, 'stroops)');
          } catch (conversionError) {
            console.error('Error converting PANDA balance:', conversionError);
            pandaBalance = '0';
          }
        } else {
          console.log('No balance result from contract simulation');
        }
      } else {
        console.log('PANDA balance simulation failed:', simulated);
      }

      set({
        balance: xlmBalance?.balance || '0',
        pandaTokenBalance: pandaBalance
      });
    } catch (error) {
      console.error('Failed to fetch balances:', error);
      try {
        const horizonServer = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');
        const account = await horizonServer.loadAccount(publicKey);
        const xlmBalance = account.balances.find((b: any) => b.asset_type === 'native');
        set({
          balance: xlmBalance?.balance || '0',
          pandaTokenBalance: '0'
        });
      } catch {
        set({ balance: '0', pandaTokenBalance: '0' });
      }
    }
  },

  fetchPandaNFTs: async () => {
    const { publicKey } = get();
    if (!publicKey) return;

    try {
      console.log('Fetching Panda NFTs for:', publicKey);

      const server = getSorobanServer();
      const horizonServer = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');
      const contract = new StellarSdk.Contract(STELLAR_CONFIG.CONTRACTS.PANDA_NFT);

      const account = await horizonServer.loadAccount(publicKey);

      const ownedOperation = contract.call(
        'get_player_pandas',
        StellarSdk.nativeToScVal(publicKey, { type: 'address' })
      );

      const ownedTransaction = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: STELLAR_CONFIG.NETWORK_PASSPHRASE
      })
        .addOperation(ownedOperation)
        .setTimeout(30)
        .build();

      const ownedSimulated = await server.simulateTransaction(ownedTransaction);
      let nftIds: number[] = [];

      if (StellarSdk.SorobanRpc.Api.isSimulationSuccess(ownedSimulated)) {
        const result = ownedSimulated.result?.retval;
        if (result) {
          const rawIds = StellarSdk.scValToNative(result) as (number | bigint)[];
          nftIds = rawIds.map(id => typeof id === 'bigint' ? Number(id) : id);
          console.log('Owned Panda NFT IDs:', nftIds);
        }
      }

      const stakedOperation = contract.call(
        'get_staked_pandas',
        StellarSdk.nativeToScVal(publicKey, { type: 'address' })
      );

      const stakedTransaction = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: STELLAR_CONFIG.NETWORK_PASSPHRASE
      })
        .addOperation(stakedOperation)
        .setTimeout(30)
        .build();

      const stakedSimulated = await server.simulateTransaction(stakedTransaction);
      let stakedIds: number[] = [];

      if (StellarSdk.SorobanRpc.Api.isSimulationSuccess(stakedSimulated)) {
        const result = stakedSimulated.result?.retval;
        if (result) {
          const rawIds = StellarSdk.scValToNative(result) as (number | bigint)[];
          stakedIds = rawIds.map(id => typeof id === 'bigint' ? Number(id) : id);
          console.log('Staked Panda NFT IDs:', stakedIds);
        }
      }

      set({ ownedPandaNFTs: nftIds, stakedPandaNFTs: stakedIds });
    } catch (error) {
      console.error('Failed to fetch Panda NFTs:', error);
      set({ ownedPandaNFTs: [], stakedPandaNFTs: [] });
    }
  },

  submitScore: async (score: number, distance: number, combo: number, nftId?: number) => {
    const { publicKey, isConnected } = get();
    if (!publicKey || !isConnected) {
      throw new Error('Wallet not connected. Please connect your wallet (Freighter) and try again.');
    }

    try {
      console.log('Submitting score to blockchain:', { score, distance, combo, nftId });

      const server = getSorobanServer();
      const horizonServer = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');
      const contract = new StellarSdk.Contract(STELLAR_CONFIG.CONTRACTS.GAME_REWARDS);

      const account = await horizonServer.loadAccount(publicKey);

      const nftIdArg = nftId !== undefined
        ? StellarSdk.nativeToScVal(nftId, { type: 'u64' })
        : StellarSdk.xdr.ScVal.scvVoid();

      const args = [
        StellarSdk.nativeToScVal(publicKey, { type: 'address' }),
        StellarSdk.nativeToScVal(score, { type: 'i128' }),
        StellarSdk.nativeToScVal(distance, { type: 'i128' }),
        StellarSdk.nativeToScVal(combo, { type: 'u32' }),
        nftIdArg
      ];

      console.log('Contract arguments:', { score, distance, combo, nftId, nftIdArg });

      const operation = contract.call('submit_score', ...args);

      let transaction = new StellarSdk.TransactionBuilder(account, {
        fee: (parseInt(StellarSdk.BASE_FEE) * 10).toString(),
        networkPassphrase: STELLAR_CONFIG.NETWORK_PASSPHRASE
      })
        .addOperation(operation)
        .setTimeout(30)
        .build();

      console.log('Simulating score submission transaction...');
      const simulated = await server.simulateTransaction(transaction);

      if (StellarSdk.SorobanRpc.Api.isSimulationSuccess(simulated)) {
        console.log('✓ Simulation successful');
        transaction = StellarSdk.SorobanRpc.assembleTransaction(transaction, simulated).build();
      } else {
        console.error('❌ Simulation failed:', simulated);
        const error = (simulated as any).error || 'Unknown simulation error';
        throw new Error(`Score submission simulation failed: ${error}`);
      }

      console.log('Requesting wallet signature...');
      const kit = getWalletKit();
      const { selectedWalletId } = get();

      if (selectedWalletId) {
        kit.setWallet(selectedWalletId);
        console.log('✓ Wallet set:', selectedWalletId);
      }

      const xdr = transaction.toXDR();

      let signedTxXdr;
      try {
        const signResult = await kit.signTransaction(xdr, {
          networkPassphrase: STELLAR_CONFIG.NETWORK_PASSPHRASE,
          address: publicKey
        });
        signedTxXdr = signResult.signedTxXdr;
        console.log('✓ Transaction signed by wallet');
      } catch (signError: any) {
        console.error('❌ Wallet signature rejected:', signError);
        console.error('Error details:', JSON.stringify(signError, null, 2));
        if (signError.message) {
          throw new Error(`Wallet signature failed: ${signError.message}`);
        }
        throw new Error('Transaction was rejected in wallet');
      }

      const signedTransaction = StellarSdk.TransactionBuilder.fromXDR(
        signedTxXdr,
        STELLAR_CONFIG.NETWORK_PASSPHRASE
      );

      console.log('Submitting to blockchain...');
      const result = await server.sendTransaction(signedTransaction);
      console.log('✓ Transaction submitted! Hash:', result.hash);

      console.log('Waiting for confirmation...');
      let attempts = 0;
      let status: any;

      while (attempts < 5) {
        try {
          await new Promise(resolve => setTimeout(resolve, 1000));
          status = await server.getTransaction(result.hash);

          console.log(`Attempt ${attempts + 1}: Status =`, status.status);

          if (status.status === StellarSdk.SorobanRpc.Api.GetTransactionStatus.SUCCESS) {
            console.log('✅ Score submission confirmed on blockchain!');
            await get().fetchBalances();
            return result.hash;
          } else if (status.status === StellarSdk.SorobanRpc.Api.GetTransactionStatus.FAILED) {
            console.error('❌ Transaction failed:', status);
            throw new Error('Transaction failed on blockchain');
          }

        } catch (statusError: any) {
          console.warn(`Error checking status (attempt ${attempts + 1}):`, statusError.message);
        }

        attempts++;
      }

      console.warn('⚠️ Confirmation timeout, but transaction was submitted:', result.hash);
      await get().fetchBalances();
      return result.hash;
    } catch (error) {
      console.error('Failed to submit score:', error);
      throw error;
    }
  },

  mintPandaNFT: async (skin: string) => {
    const { publicKey, isConnected } = get();
    if (!publicKey || !isConnected) {
      throw new Error('Wallet not connected. Please connect your wallet (Freighter) and try again.');
    }

    try {
      console.log('Minting Panda NFT with skin:', skin);

      const server = getSorobanServer();
      const horizonServer = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');
      const contract = new StellarSdk.Contract(STELLAR_CONFIG.CONTRACTS.PANDA_NFT);

      const account = await horizonServer.loadAccount(publicKey);

      const args = [
        StellarSdk.nativeToScVal(publicKey, { type: 'address' }),
        StellarSdk.nativeToScVal(skin, { type: 'string' })
      ];

      const operation = contract.call('mint', ...args);

      let transaction = new StellarSdk.TransactionBuilder(account, {
        fee: (parseInt(StellarSdk.BASE_FEE) * 10).toString(),
        networkPassphrase: STELLAR_CONFIG.NETWORK_PASSPHRASE
      })
        .addOperation(operation)
        .setTimeout(30)
        .build();

      const simulated = await server.simulateTransaction(transaction);

      if (StellarSdk.SorobanRpc.Api.isSimulationSuccess(simulated)) {
        transaction = StellarSdk.SorobanRpc.assembleTransaction(transaction, simulated).build();
      } else {
        throw new Error('Transaction simulation failed');
      }

      const kit = getWalletKit();
      const { selectedWalletId } = get();

      if (selectedWalletId) {
        kit.setWallet(selectedWalletId);
      }

      const xdr = transaction.toXDR();
      const { signedTxXdr } = await kit.signTransaction(xdr, {
        address: publicKey,
        networkPassphrase: STELLAR_CONFIG.NETWORK_PASSPHRASE
      });

      const signedTransaction = StellarSdk.TransactionBuilder.fromXDR(
        signedTxXdr,
        STELLAR_CONFIG.NETWORK_PASSPHRASE
      );

      const result = await server.sendTransaction(signedTransaction);
      console.log('NFT minting transaction submitted! Hash:', result.hash);

      let attempts = 0;
      let confirmed = false;

      while (attempts < 5 && !confirmed) {
        try {
          await new Promise(resolve => setTimeout(resolve, 1000));
          const status = await server.getTransaction(result.hash);
          console.log(`NFT mint attempt ${attempts + 1}: Status =`, status.status);

          if (status.status === StellarSdk.SorobanRpc.Api.GetTransactionStatus.SUCCESS) {
            console.log('✓ NFT minted successfully!');
            confirmed = true;
            break;
          } else if (status.status === StellarSdk.SorobanRpc.Api.GetTransactionStatus.FAILED) {
            throw new Error('Transaction failed on blockchain');
          }
        } catch (statusError: any) {
          console.warn(`Error checking NFT mint status (attempt ${attempts + 1}):`, statusError.message);
        }
        attempts++;
      }

      const returnValue = simulated.result?.retval;
      let tokenId = 0;
      if (returnValue) {
        tokenId = StellarSdk.scValToNative(returnValue) as number;
        console.log('Minted NFT Token ID (from simulation):', tokenId);
      }

      await get().fetchPandaNFTs();
      console.log('✅ NFT minting complete! TX:', result.hash);

      return tokenId;
    } catch (error: any) {
      console.error('Failed to mint Panda NFT:', error);

      if (error.message?.includes('Max 5 pandas')) {
        throw new Error('You have already minted the maximum of 5 Panda NFTs');
      }

      throw error;
    }
  },

  stakePandaNFT: async (pandaId: number) => {
    const { publicKey, ownedPandaNFTs, stakedPandaNFTs, selectedWalletId, isConnected } = get();

    if (!publicKey || !isConnected) {
      throw new Error('Wallet not connected. Please connect your wallet (Freighter) and try again.');
    }

    if (!ownedPandaNFTs.includes(pandaId)) {
      throw new Error('You do not own this Panda NFT');
    }

    if (stakedPandaNFTs.includes(pandaId)) {
      throw new Error('This Panda NFT is already staked');
    }

    try {
      console.log(`🔒 Staking Panda #${pandaId}...`);

      const server = getSorobanServer();
      const nftContract = new StellarSdk.Contract(STELLAR_CONFIG.CONTRACTS.PANDA_NFT);

      const operation = nftContract.call(
        'stake',
        StellarSdk.nativeToScVal(pandaId, { type: 'u64' })
      );

      const sourceAccount = await server.getAccount(publicKey);
      let transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: StellarSdk.Networks.TESTNET,
      })
        .addOperation(operation)
        .setTimeout(180)
        .build();

      transaction = await server.prepareTransaction(transaction);

      const kit = getWalletKit();
      if (selectedWalletId) {
        kit.setWallet(selectedWalletId);
      }

      const xdr = transaction.toXDR();
      const { signedTxXdr } = await kit.signTransaction(xdr, {
        address: publicKey,
        networkPassphrase: STELLAR_CONFIG.NETWORK_PASSPHRASE
      });

      const signedTx = StellarSdk.TransactionBuilder.fromXDR(
        signedTxXdr,
        STELLAR_CONFIG.NETWORK_PASSPHRASE
      );

      const txResult = await server.sendTransaction(signedTx);

      console.log('✅ Panda staked successfully!');

      await get().fetchPandaNFTs();

      return txResult.hash;
    } catch (error: any) {
      console.error('Failed to stake Panda:', error);
      throw new Error(`Failed to stake Panda: ${error.message}`);
    }
  },

  unstakePandaNFT: async (pandaId: number) => {
    const { publicKey, stakedPandaNFTs, selectedWalletId, isConnected } = get();

    if (!publicKey || !isConnected) {
      throw new Error('Wallet not connected. Please connect your wallet (Freighter) and try again.');
    }

    if (!stakedPandaNFTs.includes(pandaId)) {
      throw new Error('This Panda NFT is not staked');
    }

    try {
      console.log(`🔓 Unstaking Panda #${pandaId}...`);

      const server = getSorobanServer();
      const nftContract = new StellarSdk.Contract(STELLAR_CONFIG.CONTRACTS.PANDA_NFT);

      const operation = nftContract.call(
        'unstake',
        StellarSdk.nativeToScVal(pandaId, { type: 'u64' })
      );

      const sourceAccount = await server.getAccount(publicKey);
      let transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: StellarSdk.Networks.TESTNET,
      })
        .addOperation(operation)
        .setTimeout(180)
        .build();

      transaction = await server.prepareTransaction(transaction);

      const kit = getWalletKit();
      if (selectedWalletId) {
        kit.setWallet(selectedWalletId);
      }

      const xdr = transaction.toXDR();
      const { signedTxXdr } = await kit.signTransaction(xdr, {
        address: publicKey,
        networkPassphrase: STELLAR_CONFIG.NETWORK_PASSPHRASE
      });

      const signedTx = StellarSdk.TransactionBuilder.fromXDR(
        signedTxXdr,
        STELLAR_CONFIG.NETWORK_PASSPHRASE
      );

      const txResult = await server.sendTransaction(signedTx);

      console.log('✅ Panda unstaked successfully!');

      await get().fetchPandaNFTs();

      return txResult.hash;
    } catch (error: any) {
      console.error('Failed to unstake Panda:', error);
      throw new Error(`Failed to unstake Panda: ${error.message}`);
    }
  },
    }),
    {
      name: 'panda-wallet-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        publicKey: state.publicKey,
        selectedWalletId: state.selectedWalletId,
        // Don't persist isConnected - will be set by autoReconnect
        // Don't persist balances and NFTs - will be fetched on reconnect
      }),
    }
  )
);

export default useWalletStore;
