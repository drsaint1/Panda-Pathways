import React, { useRef, useEffect, useState } from 'react';
import { Game, ScoreState, SkinName, SKIN_PALETTE } from '../game/Game';
import useWalletStore from '../store/walletStore';
import TransactionNotification, { NotificationType } from './TransactionNotification';
import './GameCanvas.css';

interface Notification {
  type: NotificationType;
  title: string;
  message: string;
  txHash?: string;
}

interface GameCanvasProps {
  selectedPandaNFT: number | null;
  gameStarted: boolean;
  onPlayAgain: () => void;
  onChangePanda: () => void;
}

const GameCanvas: React.FC<GameCanvasProps> = ({
  selectedPandaNFT,
  gameStarted,
  onPlayAgain,
  onChangePanda
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const { submitScore, ownedPandaNFTs } = useWalletStore();

  const [currentScore, setCurrentScore] = useState<ScoreState | null>(null);
  const [showPrompt, setShowPrompt] = useState(true);
  const [currentSkin, setCurrentSkin] = useState<SkinName>('bamboo');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rewardEarned, setRewardEarned] = useState<number>(0);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [scoreSaved, setScoreSaved] = useState(false);
  const [notification, setNotification] = useState<Notification | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !overlayRef.current) return;

    const game = new Game({
      canvas: canvasRef.current,
      callbacks: {
        onScore: (score: ScoreState) => {
          setCurrentScore(score);
        },
        onGameOver: async (score: ScoreState) => {
          setCurrentScore(score);
          setShowPrompt(true);
          setIsSubmitting(false);
          setSubmissionError(null);
          setRewardEarned(0);

          const baseReward = (score.total * 1_000_000) / 10_000_000;
          const comboReward = (score.bestCombo * 5_000_000) / 10_000_000;
          const totalReward = baseReward + comboReward;
          setRewardEarned(totalReward);

        },
        onSkinChange: (skin: SkinName) => {
          setCurrentSkin(skin);
        }
      }
    });

    gameRef.current = game;
    game.applySkin(currentSkin);

    return () => {
      game.destroy();
    };
  }, []);

  useEffect(() => {
    if (gameStarted && gameRef.current) {
      setShowPrompt(false);
      gameRef.current.start();
    }
  }, [gameStarted]);

  const handlePlayAgainClick = () => {
    setScoreSaved(false);
    onPlayAgain();
  };

  const handleChangePandaClick = () => {
    setScoreSaved(false);
    onChangePanda();
  };

  const handleSaveScore = async () => {
    if (!currentScore) return;

    setIsSubmitting(true);
    setSubmissionError(null);
    setNotification({
      type: 'pending',
      title: 'Claiming PANDA Tokens',
      message: 'Submitting your score to the blockchain... Please confirm the transaction in your wallet.'
    });

    try {
      const txHash = await submitScore(
        currentScore.total,
        Math.floor(currentScore.distance),
        currentScore.bestCombo,
        selectedPandaNFT || undefined
      );

      console.log('✅ Score submitted successfully! TX:', txHash);
      console.log('💰 Reward earned:', rewardEarned, 'PANDA');
      setScoreSaved(true);

      setNotification({
        type: 'success',
        title: 'Tokens Claimed Successfully! 🎉',
        message: `You earned ${rewardEarned.toFixed(2)} PANDA tokens! Your score has been recorded on the Stellar blockchain.`,
        txHash
      });

    } catch (error: any) {
      console.error('Failed to submit score to blockchain:', error);
      const errorMsg = error.message || 'Failed to submit score to blockchain';
      setSubmissionError(errorMsg);

      setNotification({
        type: 'error',
        title: 'Token Claim Failed',
        message: errorMsg
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toHex = (value: number): string => {
    return '#' + value.toString(16).padStart(6, '0').toUpperCase();
  };

  const palette = SKIN_PALETTE[currentSkin];

  return (
    <div className="game-canvas-container">
      {notification && (
        <TransactionNotification
          type={notification.type}
          title={notification.title}
          message={notification.message}
          txHash={notification.txHash}
          onClose={() => setNotification(null)}
        />
      )}

      <canvas ref={canvasRef} className="game-canvas" />

      <div ref={overlayRef} className="game-overlay">
        {currentScore && !showPrompt && (
          <div className="hud">
            <div className="hud-item">
              <span className="hud-label">Score</span>
              <span className="hud-value">{currentScore.total.toLocaleString()}</span>
            </div>
            <div className="hud-item">
              <span className="hud-label">Distance</span>
              <span className="hud-value">{Math.floor(currentScore.distance).toLocaleString()}m</span>
            </div>
            <div className="hud-item">
              <span className="hud-label">Speed</span>
              <span className="hud-value">{currentScore.speed.toFixed(1)} u/s</span>
            </div>
            <div className="hud-item combo">
              <span className="hud-label">Combo</span>
              <span className="hud-value">x{currentScore.combo} • Best x{currentScore.bestCombo}</span>
            </div>
          </div>
        )}

        {!showPrompt && selectedPandaNFT !== null && (
          <div className="skin-indicator">
            <div className="indicator-header">Playing as Panda #{selectedPandaNFT}</div>
            <div className="indicator-name">{currentSkin.charAt(0).toUpperCase() + currentSkin.slice(1)}</div>
            <div className="indicator-swatches">
              <span className="swatch" style={{ backgroundColor: toHex(palette.base) }} title="Body" />
              <span className="swatch" style={{ backgroundColor: toHex(palette.accent) }} title="Markings" />
              <span className="swatch" style={{ backgroundColor: toHex(palette.boot) }} title="Boots" />
            </div>
          </div>
        )}

        {showPrompt && (
          <div className="game-prompt">
            {!gameStarted ? (
              <>
                <h2 className="prompt-title">Ready to Run?</h2>
                <p className="prompt-description">
                  Sprint through bamboo wilds, dodge obstacles, and earn PANDA tokens!
                </p>

                {selectedPandaNFT !== null && (
                  <div className="selected-panda-info">
                    <span className="panda-label">Playing with:</span>
                    <span className="panda-name">Panda #{selectedPandaNFT}</span>
                  </div>
                )}

                <div className="controls-info">
                  <h4>Controls:</h4>
                  <div className="control-list">
                    <div className="control-item">
                      <kbd>← →</kbd> or <kbd>A D</kbd> Dodge left/right
                    </div>
                    <div className="control-item">
                      <kbd>Space</kbd> or <kbd>W</kbd> Jump
                    </div>
                    <div className="control-item">
                      <kbd>Shift</kbd> or <kbd>S</kbd> Crouch
                    </div>
                  </div>
                </div>

                <button className="start-button" onClick={handlePlayAgainClick}>
                  🎮 Start Run
                </button>
              </>
            ) : (
              <>
                <h2 className="prompt-title">
                  Run Complete! 🎉
                </h2>

                {currentScore && (
                  <div className="score-summary">
                    <div className="summary-item highlight">
                      <span className="summary-label">Final Score</span>
                      <span className="summary-value">{currentScore.total.toLocaleString()}</span>
                    </div>
                    <div className="summary-grid">
                      <div className="summary-item">
                        <span className="summary-label">Distance</span>
                        <span className="summary-value">{Math.floor(currentScore.distance).toLocaleString()}m</span>
                      </div>
                      <div className="summary-item">
                        <span className="summary-label">Best Combo</span>
                        <span className="summary-value">x{currentScore.bestCombo}</span>
                      </div>
                    </div>
                  </div>
                )}

                {rewardEarned > 0 && (
                  <div className="reward-earned">
                    <div className="reward-icon">🎁</div>
                    <div className="reward-content">
                      <div className="reward-label">
                        {scoreSaved ? 'Tokens Earned' : 'Potential Reward'}
                      </div>
                      <div className="reward-amount">+{rewardEarned.toFixed(2)} PANDA</div>
                      <div className="reward-note">
                        {isSubmitting
                          ? 'Recording on blockchain...'
                          : scoreSaved
                            ? 'Recorded on Stellar blockchain ✓'
                            : 'Save your score to earn these tokens!'}
                      </div>
                    </div>
                  </div>
                )}

                {!isSubmitting && submissionError && (
                  <div className="submission-error">
                    <div className="error-icon">⚠️</div>
                    <div className="error-content">
                      <div className="error-label">Blockchain Submission Failed</div>
                      <div className="error-message">{submissionError}</div>
                      <div className="error-note">Try again or play without saving</div>
                    </div>
                  </div>
                )}

                <div className="game-buttons">
                  {!scoreSaved && (
                    <button
                      className="start-button primary"
                      onClick={handleSaveScore}
                      disabled={isSubmitting || scoreSaved}
                    >
                      {isSubmitting ? 'Saving...' : '💰 Save Score & Earn PANDA'}
                    </button>
                  )}

                  <button
                    className="start-button secondary"
                    onClick={handlePlayAgainClick}
                    disabled={isSubmitting}
                  >
                    🎮 Play Again
                  </button>

                  <button
                    className="start-button tertiary"
                    onClick={handleChangePandaClick}
                    disabled={isSubmitting}
                  >
                    🔄 Change Panda
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default GameCanvas;
