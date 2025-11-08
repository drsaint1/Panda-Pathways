import React from 'react';
import './Leaderboard.css';

const MOCK_LEADERBOARD = [
  { rank: 1, player: 'BambooBlitz', score: 4820, combo: 23, rewards: 124.5 },
  { rank: 2, player: 'AuroraStride', score: 4375, combo: 19, rewards: 113.2 },
  { rank: 3, player: 'EmberDash', score: 4102, combo: 17, rewards: 98.4 },
  { rank: 4, player: 'GoldenSprint', score: 3920, combo: 16, rewards: 92.1 },
  { rank: 5, player: 'FestivalFlow', score: 3658, combo: 15, rewards: 84.7 },
];

const Leaderboard: React.FC = () => {
  return (
    <div className="leaderboard-container">
      <header className="leaderboard-header">
        <div>
          <p className="leaderboard-label">Top runners</p>
          <h3>Panda Pathways Elite</h3>
        </div>
        <div className="leaderboard-chip">Updated hourly</div>
      </header>

      <div className="leaderboard-table">
        <div className="leaderboard-row header">
          <span>#</span>
          <span>Player</span>
          <span>High Score</span>
          <span>Best Combo</span>
          <span>PANDA Earned</span>
        </div>
        {MOCK_LEADERBOARD.map((entry) => (
          <div key={entry.rank} className="leaderboard-row">
            <span>{entry.rank}</span>
            <span className="player">{entry.player}</span>
            <span>{entry.score.toLocaleString()}</span>
            <span>x{entry.combo}</span>
            <span>{entry.rewards.toFixed(1)} PANDA</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Leaderboard;
