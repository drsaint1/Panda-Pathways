#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, Address, Env, String, Map, Vec};

#[contracttype]
pub enum DataKey {
    Admin,
    Initialized,
    Balances,
    Minters,
}

#[contract]
pub struct PandaToken;

#[contractimpl]
impl PandaToken {
    pub fn initialize(env: Env, admin: Address) {
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Initialized, &true);

        let mut minters = Vec::new(&env);
        minters.push_back(admin);
        env.storage().instance().set(&DataKey::Minters, &minters);
    }

    pub fn add_minter(env: Env, minter: Address) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();

        let mut minters: Vec<Address> = env.storage()
            .instance()
            .get(&DataKey::Minters)
            .unwrap_or(Vec::new(&env));

        minters.push_back(minter);
        env.storage().instance().set(&DataKey::Minters, &minters);
    }

    pub fn mint(env: Env, to: Address, amount: i128) {
        let mut balances: Map<Address, i128> = env.storage()
            .persistent()
            .get(&DataKey::Balances)
            .unwrap_or(Map::new(&env));

        let current_balance: i128 = balances.get(to.clone()).unwrap_or(0);
        balances.set(to, current_balance + amount);
        env.storage().persistent().set(&DataKey::Balances, &balances);
    }

    pub fn transfer(env: Env, from: Address, to: Address, amount: i128) {
        from.require_auth();

        let mut balances: Map<Address, i128> = env.storage()
            .persistent()
            .get(&DataKey::Balances)
            .unwrap_or(Map::new(&env));

        let from_balance: i128 = balances.get(from.clone()).unwrap_or(0);
        if from_balance < amount {
            panic!("Insufficient balance");
        }

        let to_balance: i128 = balances.get(to.clone()).unwrap_or(0);
        balances.set(from.clone(), from_balance - amount);
        balances.set(to, to_balance + amount);
        env.storage().persistent().set(&DataKey::Balances, &balances);
    }

    pub fn balance(env: Env, id: Address) -> i128 {
        let balances: Map<Address, i128> = env.storage()
            .persistent()
            .get(&DataKey::Balances)
            .unwrap_or(Map::new(&env));
        balances.get(id).unwrap_or(0)
    }

    pub fn get_admin(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Admin).unwrap()
    }

    pub fn name(env: Env) -> String {
        String::from_str(&env, "Panda Rewards Token")
    }

    pub fn symbol(env: Env) -> String {
        String::from_str(&env, "PANDA")
    }

    pub fn decimals(_env: Env) -> u32 {
        7
    }
}
