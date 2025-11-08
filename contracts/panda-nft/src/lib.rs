#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, String, Vec};

const MAX_PANDAS_PER_PLAYER: u32 = 5;

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
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

#[contracttype]
pub enum DataKey {
    Admin,
    TokenCounter,
    Owner(u64),
    TokenData(u64),
    PlayerTokens(Address),
    PlayerCount(Address),
    StakedTokens(Address),
    StakedCount(Address),
}

#[contract]
pub struct PandaNFTContract;

#[contractimpl]
impl PandaNFTContract {
    pub fn initialize(env: Env, admin: Address) {
        admin.require_auth();

        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::TokenCounter, &0u64);
    }

    pub fn mint(env: Env, to: Address, skin: String) -> u64 {
        to.require_auth();

        let player_count: u32 = env.storage()
            .persistent()
            .get(&DataKey::PlayerCount(to.clone()))
            .unwrap_or(0);

        if player_count >= MAX_PANDAS_PER_PLAYER {
            panic!("Max 5 pandas per player");
        }

        let token_id: u64 = env.storage()
            .instance()
            .get(&DataKey::TokenCounter)
            .unwrap_or(0);
        env.storage().instance().set(&DataKey::TokenCounter, &(token_id + 1));

        let nft = PandaNFT {
            token_id,
            owner: to.clone(),
            skin: skin.clone(),
            minted_at: env.ledger().timestamp(),
            games_played: 0,
            total_score: 0,
            is_staked: false,
            staked_at: 0,
        };

        env.storage().persistent().set(&DataKey::TokenData(token_id), &nft);
        env.storage().persistent().set(&DataKey::Owner(token_id), &to);

        let mut player_tokens: Vec<u64> = env.storage()
            .persistent()
            .get(&DataKey::PlayerTokens(to.clone()))
            .unwrap_or(Vec::new(&env));
        player_tokens.push_back(token_id);
        env.storage().persistent().set(&DataKey::PlayerTokens(to.clone()), &player_tokens);

        env.storage().persistent().set(&DataKey::PlayerCount(to), &(player_count + 1));

        token_id
    }

    pub fn get_owner(env: Env, token_id: u64) -> Option<Address> {
        env.storage().persistent().get(&DataKey::Owner(token_id))
    }

    pub fn get_token_data(env: Env, token_id: u64) -> Option<PandaNFT> {
        env.storage().persistent().get(&DataKey::TokenData(token_id))
    }

    pub fn get_player_pandas(env: Env, player: Address) -> Vec<u64> {
        env.storage()
            .persistent()
            .get(&DataKey::PlayerTokens(player))
            .unwrap_or(Vec::new(&env))
    }

    pub fn get_player_panda_count(env: Env, player: Address) -> u32 {
        env.storage()
            .persistent()
            .get(&DataKey::PlayerCount(player))
            .unwrap_or(0)
    }

    pub fn update_panda_stats(env: Env, token_id: u64, games_played: u32, score: i128) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();

        if let Some(mut nft) = env.storage().persistent().get::<DataKey, PandaNFT>(&DataKey::TokenData(token_id)) {
            nft.games_played = games_played;
            nft.total_score = score;
            env.storage().persistent().set(&DataKey::TokenData(token_id), &nft);
        }
    }

    pub fn get_total_supply(env: Env) -> u64 {
        env.storage().instance().get(&DataKey::TokenCounter).unwrap_or(0)
    }

    pub fn can_mint_more(env: Env, player: Address) -> bool {
        let count: u32 = env.storage()
            .persistent()
            .get(&DataKey::PlayerCount(player))
            .unwrap_or(0);
        count < MAX_PANDAS_PER_PLAYER
    }

    pub fn stake(env: Env, token_id: u64) {
        let mut nft: PandaNFT = env.storage()
            .persistent()
            .get(&DataKey::TokenData(token_id))
            .expect("NFT does not exist");

        nft.owner.require_auth();

        if nft.is_staked {
            panic!("NFT is already staked");
        }

        nft.is_staked = true;
        nft.staked_at = env.ledger().timestamp();
        env.storage().persistent().set(&DataKey::TokenData(token_id), &nft);

        let mut staked_tokens: Vec<u64> = env.storage()
            .persistent()
            .get(&DataKey::StakedTokens(nft.owner.clone()))
            .unwrap_or(Vec::new(&env));
        staked_tokens.push_back(token_id);
        env.storage().persistent().set(&DataKey::StakedTokens(nft.owner.clone()), &staked_tokens);

        let staked_count: u32 = env.storage()
            .persistent()
            .get(&DataKey::StakedCount(nft.owner.clone()))
            .unwrap_or(0);
        env.storage().persistent().set(&DataKey::StakedCount(nft.owner), &(staked_count + 1));
    }

    pub fn unstake(env: Env, token_id: u64) {
        let mut nft: PandaNFT = env.storage()
            .persistent()
            .get(&DataKey::TokenData(token_id))
            .expect("NFT does not exist");

        nft.owner.require_auth();

        if !nft.is_staked {
            panic!("NFT is not staked");
        }

        nft.is_staked = false;
        nft.staked_at = 0;
        env.storage().persistent().set(&DataKey::TokenData(token_id), &nft);

        let mut staked_tokens: Vec<u64> = env.storage()
            .persistent()
            .get(&DataKey::StakedTokens(nft.owner.clone()))
            .unwrap_or(Vec::new(&env));

        let mut new_staked_tokens = Vec::new(&env);
        for i in 0..staked_tokens.len() {
            if staked_tokens.get(i).unwrap() != token_id {
                new_staked_tokens.push_back(staked_tokens.get(i).unwrap());
            }
        }
        env.storage().persistent().set(&DataKey::StakedTokens(nft.owner.clone()), &new_staked_tokens);

        let staked_count: u32 = env.storage()
            .persistent()
            .get(&DataKey::StakedCount(nft.owner.clone()))
            .unwrap_or(0);
        if staked_count > 0 {
            env.storage().persistent().set(&DataKey::StakedCount(nft.owner), &(staked_count - 1));
        }
    }

    pub fn get_staked_pandas(env: Env, player: Address) -> Vec<u64> {
        env.storage()
            .persistent()
            .get(&DataKey::StakedTokens(player))
            .unwrap_or(Vec::new(&env))
    }

    pub fn get_staked_count(env: Env, player: Address) -> u32 {
        env.storage()
            .persistent()
            .get(&DataKey::StakedCount(player))
            .unwrap_or(0)
    }

    pub fn get_staking_duration(env: Env, token_id: u64) -> u64 {
        let nft: PandaNFT = env.storage()
            .persistent()
            .get(&DataKey::TokenData(token_id))
            .expect("NFT does not exist");

        if !nft.is_staked {
            return 0;
        }

        let current_time = env.ledger().timestamp();
        if current_time > nft.staked_at {
            current_time - nft.staked_at
        } else {
            0
        }
    }

    pub fn is_nft_staked(env: Env, token_id: u64) -> bool {
        if let Some(nft) = env.storage().persistent().get::<DataKey, PandaNFT>(&DataKey::TokenData(token_id)) {
            nft.is_staked
        } else {
            false
        }
    }
}
