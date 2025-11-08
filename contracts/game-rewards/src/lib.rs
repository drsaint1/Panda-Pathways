#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, symbol_short, Address, Env, IntoVal, Vec};

#[contracttype]
#[derive(Clone, Debug)]
pub struct GameScore {
    pub player: Address,
    pub score: i128,
    pub distance: i128,
    pub combo: u32,
    pub timestamp: u64,
    pub panda_nft_id: Option<u64>,
}

#[contracttype]
pub enum DataKey {
    Admin,
    TokenAddress,
    NFTAddress,
    RewardRate,
    PlayerScores(Address),
    TotalGamesPlayed,
}

const BASE_REWARD_MULTIPLIER: i128 = 1_000_000;
const COMBO_BONUS_MULTIPLIER: i128 = 5_000_000;

#[contract]
pub struct GameRewards;

#[contractimpl]
impl GameRewards {
    pub fn initialize(
        env: Env,
        admin: Address,
        token_address: Address,
        nft_address: Address,
    ) {
        admin.require_auth();

        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::TokenAddress, &token_address);
        env.storage().instance().set(&DataKey::NFTAddress, &nft_address);
        env.storage().instance().set(&DataKey::TotalGamesPlayed, &0u64);
    }

    pub fn submit_score(
        env: Env,
        player: Address,
        score: i128,
        distance: i128,
        combo: u32,
        panda_nft_id: Option<u64>,
    ) -> i128 {
        player.require_auth();

        let base_reward = score * BASE_REWARD_MULTIPLIER;
        let combo_reward = (combo as i128) * COMBO_BONUS_MULTIPLIER;
        let total_reward = base_reward + combo_reward;

        let game_score = GameScore {
            player: player.clone(),
            score,
            distance,
            combo,
            timestamp: env.ledger().timestamp(),
            panda_nft_id,
        };

        let mut player_scores: Vec<GameScore> = env.storage()
            .persistent()
            .get(&DataKey::PlayerScores(player.clone()))
            .unwrap_or(Vec::new(&env));
        player_scores.push_back(game_score);
        env.storage().persistent().set(&DataKey::PlayerScores(player.clone()), &player_scores);

        let total_games: u64 = env.storage().instance().get(&DataKey::TotalGamesPlayed).unwrap_or(0);
        env.storage().instance().set(&DataKey::TotalGamesPlayed, &(total_games + 1));

        let token_address: Address = env.storage().instance().get(&DataKey::TokenAddress).unwrap();
        let mint_args = (player.clone(), total_reward);
        env.invoke_contract::<()>(
            &token_address,
            &symbol_short!("mint"),
            mint_args.into_val(&env)
        );

        total_reward
    }

    pub fn get_player_scores(env: Env, player: Address) -> Vec<GameScore> {
        env.storage()
            .persistent()
            .get(&DataKey::PlayerScores(player))
            .unwrap_or(Vec::new(&env))
    }

    pub fn get_total_games_played(env: Env) -> u64 {
        env.storage().instance().get(&DataKey::TotalGamesPlayed).unwrap_or(0)
    }

    pub fn calculate_reward(_env: Env, score: i128, combo: u32) -> i128 {
        let base_reward = score * BASE_REWARD_MULTIPLIER;
        let combo_reward = (combo as i128) * COMBO_BONUS_MULTIPLIER;
        base_reward + combo_reward
    }

    pub fn get_reward_rate(_env: Env) -> (i128, i128) {
        (BASE_REWARD_MULTIPLIER, COMBO_BONUS_MULTIPLIER)
    }

    pub fn update_token_address(env: Env, new_token_address: Address) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();

        env.storage().instance().set(&DataKey::TokenAddress, &new_token_address);
    }
}
