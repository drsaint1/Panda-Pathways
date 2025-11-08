import React, { useState } from 'react';
import useWalletStore from '../store/walletStore';
import { SKIN_PALETTE, SkinName } from '../game/Game';
import TransactionNotification, { NotificationType } from './TransactionNotification';
import './PandaNFTMint.css';

interface Notification {
  type: NotificationType;
  title: string;
  message: string;
  txHash?: string;
}

interface PandaNFTMintProps {
  onClose: () => void;
  onMinted: () => void;
  isFirstMint?: boolean;
}

interface SkinOption {
  id: SkinName;
  name: string;
  description: string;
  colors: { base: number; accent: number; boot: number };
}

const SKIN_OPTIONS: SkinOption[] = [
  {
    id: 'bamboo',
    name: 'Bamboo Scout',
    description: 'Classic forest roamer with charcoal boots',
    colors: SKIN_PALETTE.bamboo
  },
  {
    id: 'aurora',
    name: 'Aurora Glide',
    description: 'Frost-tinted fur and midnight runners',
    colors: SKIN_PALETTE.aurora
  },
  {
    id: 'ember',
    name: 'Ember Dash',
    description: 'Sunrise blush coat with ember soles',
    colors: SKIN_PALETTE.ember
  },
  {
    id: 'golden',
    name: 'Golden Fur',
    description: 'Radiant champion gilded for legendary runs',
    colors: SKIN_PALETTE.golden
  },
  {
    id: 'samurai',
    name: 'Samurai Spirit',
    description: 'Crimson markings for fearless duelists',
    colors: SKIN_PALETTE.samurai
  },
  {
    id: 'festival',
    name: 'Festival Lights',
    description: 'Lantern-lit hues celebrating perfect flows',
    colors: SKIN_PALETTE.festival
  }
];

const PandaNFTMint: React.FC<PandaNFTMintProps> = ({ onClose, onMinted, isFirstMint = false }) => {
  const { mintPandaNFT, ownedPandaNFTs, fetchPandaNFTs } = useWalletStore();
  const [selectedSkin, setSelectedSkin] = useState<SkinName>('bamboo');
  const [isMinting, setIsMinting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notification | null>(null);

  const selectedSkinOption =
    SKIN_OPTIONS.find((skin) => skin.id === selectedSkin) ?? SKIN_OPTIONS[0];

  const toHex = (value: number): string => {
    return '#' + value.toString(16).padStart(6, '0').toUpperCase();
  };

  const handleMint = async () => {
    if (ownedPandaNFTs.length >= 5) {
      setError('You already own 5 Pandas (maximum reached)');
      setNotification({
        type: 'error',
        title: 'Cannot Mint NFT',
        message: 'You already own 5 Pandas (maximum reached)'
      });
      return;
    }

    setIsMinting(true);
    setError(null);
    setSuccess(null);
    setNotification({
      type: 'pending',
      title: 'Minting Panda NFT',
      message: `Minting ${selectedSkinOption.name}... Please confirm the transaction in your wallet.`
    });

    try {
      await mintPandaNFT(selectedSkin);
      setSuccess(`🎉 Successfully minted ${selectedSkinOption.name}!`);

      setNotification({
        type: 'success',
        title: 'NFT Minted Successfully! 🎉',
        message: `Your ${selectedSkinOption.name} NFT has been minted! You can now use it to play the game and earn rewards.`
      });

      await fetchPandaNFTs();
      onMinted();
      if (isFirstMint) {
        setTimeout(() => onClose(), 2000);
      }
    } catch (err: any) {
      console.error('Minting error:', err);
      let errorMessage = 'Failed to mint Panda NFT';

      if (err.message?.includes('Max 5 pandas')) {
        errorMessage = 'You have already minted the maximum of 5 Panda NFTs';
      } else if (err.message?.includes('User declined') || err.message?.includes('rejected')) {
        errorMessage = 'Transaction was rejected. Please try again.';
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      setNotification({
        type: 'error',
        title: 'Minting Failed',
        message: errorMessage
      });
      setIsMinting(false);
    }
  };


  return (
    <div className="modal-overlay" onClick={onClose}>
      {notification && (
        <TransactionNotification
          type={notification.type}
          title={notification.title}
          message={notification.message}
          txHash={notification.txHash}
          onClose={() => setNotification(null)}
        />
      )}
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Mint Your Panda NFT</h2>
          <button className="close-button" onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        <div className="modal-body">
          <div className="mint-header">
            <div className="mint-info">
              <div className="info-badge">
                <span className="badge-icon">🎨</span>
                <div>
                  <div className="badge-label">Your Collection</div>
                  <div className="badge-value">{ownedPandaNFTs.length} / 5 Minted</div>
                </div>
              </div>
            </div>
          </div>

        {ownedPandaNFTs.length >= 5 ? (
          <div className="max-reached">
            <div className="max-icon">🎉</div>
            <h3>Collection Complete!</h3>
            <p>You've minted the maximum of 5 Panda NFTs</p>
          </div>
        ) : (
          <>
            <div className="mint-layout">
              <section className="preview-panel">
                <div className="preview-card">
                  <div className="preview-header">
                    <div className="preview-label">Selected Panda</div>
                    <h3>{selectedSkinOption.name}</h3>
                    <p>{selectedSkinOption.description}</p>
                  </div>
                  <div className="preview-visual">
                    <div
                      className="preview-blob"
                      style={{
                        background: `radial-gradient(circle at 30% 30%, ${toHex(
                          selectedSkinOption.colors.accent
                        )}, transparent 55%), radial-gradient(circle at 70% 70%, ${toHex(
                          selectedSkinOption.colors.boot
                        )}, transparent 45%), linear-gradient(140deg, ${toHex(
                          selectedSkinOption.colors.base
                        )}, ${toHex(selectedSkinOption.colors.accent)})`
                      }}
                    >
                      <div className="preview-ring" />
                      <span className="preview-emoji">🐼</span>
                    </div>
                  </div>
                  <div className="preview-swatches">
                    <div className="swatch-group">
                      <span className="swatch-label">Primary</span>
                      <span
                        className="swatch-dot"
                        style={{ backgroundColor: toHex(selectedSkinOption.colors.base) }}
                      />
                    </div>
                    <div className="swatch-group">
                      <span className="swatch-label">Accent</span>
                      <span
                        className="swatch-dot"
                        style={{ backgroundColor: toHex(selectedSkinOption.colors.accent) }}
                      />
                    </div>
                    <div className="swatch-group">
                      <span className="swatch-label">Boots</span>
                      <span
                        className="swatch-dot"
                        style={{ backgroundColor: toHex(selectedSkinOption.colors.boot) }}
                      />
                    </div>
                  </div>
                </div>
              </section>

              <section className="selection-panel">
                <div className="selection-header">
                  <h3>Choose a Panda look</h3>
                </div>

                <div className="skin-grid">
                  {SKIN_OPTIONS.map((skin, index) => {
                    const isOwned = index < ownedPandaNFTs.length;
                    return (
                      <button
                        key={skin.id}
                        type="button"
                        className={`skin-card ${selectedSkin === skin.id ? 'active' : ''} ${isOwned ? 'owned' : ''}`}
                        onClick={() => setSelectedSkin(skin.id)}
                      >
                        <div className="skin-card-top">
                          <span className="skin-card-name">{skin.name}</span>
                          {isOwned && (
                            <span className="skin-card-badge owned-badge">✓ Owned</span>
                          )}
                          {selectedSkin === skin.id && !isOwned && (
                            <span className="skin-card-badge">Selected</span>
                          )}
                          {selectedSkin === skin.id && (
                            <span className="skin-card-check">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </span>
                          )}
                        </div>
                      <p className="skin-card-description">{skin.description}</p>
                      <div className="skin-card-swatches">
                        <span className="skin-card-dot" style={{ backgroundColor: toHex(skin.colors.base) }} />
                        <span className="skin-card-dot" style={{ backgroundColor: toHex(skin.colors.accent) }} />
                        <span className="skin-card-dot" style={{ backgroundColor: toHex(skin.colors.boot) }} />
                      </div>
                    </button>
                    );
                  })}
                </div>
              </section>
            </div>
            {error && (
              <div className="mint-error">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                  <path d="M12 8V12M12 16H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                {error}
              </div>
            )}

            {success && (
              <div className="mint-success">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                  <path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {success}
              </div>
            )}
            </>
          )}

          <div className="mint-actions footer-actions">
            <button className="secondary-button" onClick={onClose}>
              Cancel
            </button>
            <button
              className="primary-button"
              onClick={handleMint}
              disabled={isMinting || ownedPandaNFTs.length >= 5}
            >
              {isMinting ? (
                <>
                  <span className="spinner"></span>
                  Minting...
                </>
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  Mint Panda NFT
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PandaNFTMint;
