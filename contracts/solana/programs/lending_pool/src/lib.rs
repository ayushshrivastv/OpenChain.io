use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer, Mint};

use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::clock::Clock;
use std::collections::HashMap;

// LayerZero V2 OApp Constants
pub const LAYERZERO_ENDPOINT_PROGRAM_ID: Pubkey = pubkey!("76y77prsiCMvXMjuoZ5VRrhG5qYBrUMYTE5WgHqgjEn6"); // Solana Mainnet
pub const STORE_SEED: &[u8] = b"Store";
pub const PEER_SEED: &[u8] = b"Peer";
pub const LZ_RECEIVE_TYPES_SEED: &[u8] = b"LzReceiveTypes";
pub const LZ_COMPOSE_TYPES_SEED: &[u8] = b"LzComposeTypes";
pub const ENDPOINT_ID: u32 = 30168; // Solana Mainnet EID

// LayerZero V2 CPI instruction discriminators
pub const LZ_SEND_DISCRIMINATOR: [u8; 8] = [0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08];
pub const LZ_CLEAR_DISCRIMINATOR: [u8; 8] = [0x08, 0x07, 0x06, 0x05, 0x04, 0x03, 0x02, 0x01];

declare_id!("AiTX9Gr1KjTcExetmdpP7PeoYWnY3MpSNbPBpDu9UPrB");

// Error codes
#[error_code]
pub enum ErrorCode {
    #[msg("Insufficient collateral")]
    InsufficientCollateral,
    #[msg("Asset not supported")]
    AssetNotSupported,
    #[msg("Health factor too low")]
    HealthFactorTooLow,
    #[msg("Invalid amount")]
    InvalidAmount,
    #[msg("Rate limited")]
    RateLimited,
    #[msg("Not authorized")]
    NotAuthorized,
    #[msg("Cross-chain operation failed")]
    CrossChainFailed,
    #[msg("Invalid price data")]
    InvalidPriceData,
    #[msg("Liquidation not allowed")]
    LiquidationNotAllowed,
    #[msg("Position not found")]
    PositionNotFound,
    #[msg("Chain not supported")]
    ChainNotSupported,
    #[msg("Position healthy")]
    PositionHealthy,
    #[msg("Math overflow")]
    MathOverflow,
    #[msg("Insufficient fee for LayerZero message")]
    InsufficientFee,
    #[msg("LayerZero endpoint CPI failed")]
    LayerZeroCpiFailed,
}

// Constants
pub const PRECISION: u64 = 1_000_000_000_000_000_000; // 1e18
pub const MIN_HEALTH_FACTOR: u64 = PRECISION; // 1.0
pub const LIQUIDATION_THRESHOLD: u64 = 950_000_000_000_000_000; // 0.95
pub const LIQUIDATION_BONUS: u64 = 50_000_000_000_000_000; // 0.05 (5%)
pub const MAX_LTV: u64 = 750_000_000_000_000_000; // 0.75 (75%)

// LayerZero V2 OApp Parameters
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct InitStoreParams {
    pub admin: Pubkey,
    pub endpoint: Pubkey,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct RegisterOAppParams {
    pub delegate: Pubkey,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct LzReceiveParams {
    pub src_eid: u32,
    pub sender: [u8; 32],
    pub nonce: u64,
    pub guid: [u8; 32],
    pub message: Vec<u8>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct ClearParams {
    pub receiver: Pubkey,
    pub src_eid: u32,
    pub sender: [u8; 32],
    pub nonce: u64,
    pub guid: [u8; 32],
    pub message: Vec<u8>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct SendParams {
    pub dst_eid: u32,
    pub receiver: [u8; 32],
    pub message: Vec<u8>,
    pub options: Vec<u8>,
    pub native_fee: u64,
    pub lz_token_fee: u64,
}

// LayerZero V2 Cross-chain message structure
#[derive(BorshSerialize, BorshDeserialize, Clone, Debug)]
pub struct CrossChainMessage {
    pub action: String,
    pub user: Pubkey,
    pub amount: u64,
    pub asset: Pubkey,
    pub timestamp: i64,
    pub source_chain: u32,
    pub dest_chain: u32,
    pub receiver: [u8; 32],
    pub nonce: u64,
}



// Asset configuration structure
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct AssetConfig {
    pub price_feed: Pubkey,
    pub ltv: u64,
    pub liquidation_threshold: u64,
    pub can_be_collateral: bool,
    pub can_be_borrowed: bool,
}

#[program]
pub mod lending_pool {
    use super::*;

    // LayerZero V2 OApp Store Initialization
    pub fn init_oapp_store(
        ctx: Context<InitOAppStore>,
        params: InitStoreParams,
    ) -> Result<()> {
        let store = &mut ctx.accounts.store;
        store.admin = params.admin;
        store.endpoint_program = params.endpoint;
        store.bump = ctx.bumps.store;
        store.lending_pool = Pubkey::default(); // Will be set when lending pool is initialized

        // Set up the "types" PDAs so the SDK can find them
        ctx.accounts.lz_receive_types_accounts.store = store.key();
        ctx.accounts.lz_compose_types_accounts.store = store.key();

        // TODO: Register with LayerZero endpoint via CPI
        // This would call the LayerZero endpoint program to register this OApp
        msg!("LayerZero V2 OApp Store initialized with admin: {}", params.admin);
        
        Ok(())
    }

    /// Initialize the lending pool with LayerZero V2 OApp configuration
    pub fn initialize(
        ctx: Context<Initialize>,
        admin: Pubkey,
        layerzero_endpoint: Pubkey,
        delegate: Pubkey,
        oapp_store: Pubkey,
    ) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        pool.admin = admin;
        pool.layerzero_endpoint = layerzero_endpoint;
        pool.delegate = delegate;
        pool.oapp_store = oapp_store;
        pool.is_paused = false;
        pool.total_assets = 0;
        pool.message_nonce = 0;
        
        // Initialize supported chains (EVM chains)
        let mut supported_chains = HashMap::new();
        supported_chains.insert(40161, true); // Sepolia
        supported_chains.insert(40231, true); // Arbitrum Sepolia
        supported_chains.insert(40245, true); // Base Sepolia
        pool.supported_chains = supported_chains;
        
        pool.bump = ctx.bumps.pool;

        msg!("LayerZero V2 OApp lending pool initialized with admin: {}", admin);
        Ok(())
    }

    /// Add a supported asset to the lending pool
    pub fn add_supported_asset(
        ctx: Context<AddSupportedAsset>,
        asset_config: AssetConfig,
    ) -> Result<()> {
        require!(!ctx.accounts.pool.is_paused, ErrorCode::NotAuthorized);

        let asset_info = &mut ctx.accounts.asset_info;
        asset_info.mint = ctx.accounts.mint.key();
        asset_info.price_feed = asset_config.price_feed;
        asset_info.ltv = asset_config.ltv;
        asset_info.liquidation_threshold = asset_config.liquidation_threshold;
        asset_info.is_active = true;
        asset_info.can_be_collateral = asset_config.can_be_collateral;
        asset_info.can_be_borrowed = asset_config.can_be_borrowed;
        asset_info.total_deposits = 0;
        asset_info.total_borrows = 0;
        asset_info.bump = ctx.bumps.asset_info;

        let pool = &mut ctx.accounts.pool;
        pool.total_assets = pool.total_assets.checked_add(1).unwrap();

        emit!(AssetAddedEvent {
            mint: ctx.accounts.mint.key(),
            ltv: asset_config.ltv,
            liquidation_threshold: asset_config.liquidation_threshold,
        });

        Ok(())
    }

    /// Deposit collateral
    pub fn deposit(ctx: Context<DepositAccounts>, amount: u64) -> Result<()> {
        require!(amount > 0, ErrorCode::InvalidAmount);
        require!(!ctx.accounts.pool.is_paused, ErrorCode::NotAuthorized);
        require!(ctx.accounts.asset_info.is_active, ErrorCode::AssetNotSupported);
        require!(ctx.accounts.asset_info.can_be_collateral, ErrorCode::AssetNotSupported);

        // Rate limiting check
        let user_position = &mut ctx.accounts.user_position;
        let current_time = Clock::get()?.unix_timestamp;
        if user_position.last_action_timestamp + 900 > current_time { // 15 minutes
            return Err(ErrorCode::RateLimited.into());
        }

        // Transfer tokens from user to pool
        let cpi_accounts = Transfer {
            from: ctx.accounts.user_token_account.to_account_info(),
            to: ctx.accounts.pool_token_account.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, amount)?;

        // Update user position
        if user_position.user == Pubkey::default() {
            user_position.user = ctx.accounts.user.key();
            user_position.bump = ctx.bumps.user_position;
        }

        user_position.collateral_balance = user_position.collateral_balance
            .checked_add(amount)
            .unwrap();
        user_position.last_action_timestamp = current_time;

        // Update asset info
        let asset_info = &mut ctx.accounts.asset_info;
        asset_info.total_deposits = asset_info.total_deposits
            .checked_add(amount)
            .unwrap();

        // Update health factor
        update_health_factor(user_position, &ctx.remaining_accounts)?;

        emit!(DepositEvent {
            user: ctx.accounts.user.key(),
            mint: ctx.accounts.mint.key(),
            amount,
            chain_selector: 0, // Current chain
        });

        Ok(())
    }

    /// Cross-chain borrow using LayerZero V2 OApp
    pub fn borrow_cross_chain(
        ctx: Context<BorrowCrossChain>,
        amount: u64,
        dest_chain_id: u32,
        receiver: [u8; 32],
        _options: Vec<u8>,
    ) -> Result<()> {
        require!(amount > 0, ErrorCode::InvalidAmount);
        require!(!ctx.accounts.pool.is_paused, ErrorCode::NotAuthorized);
        require!(ctx.accounts.asset_info.is_active, ErrorCode::AssetNotSupported);
        require!(ctx.accounts.asset_info.can_be_borrowed, ErrorCode::AssetNotSupported);

        let pool = &mut ctx.accounts.pool;
        let user_position = &mut ctx.accounts.user_position;
        let asset_info = &ctx.accounts.asset_info;

        // Validate destination chain
        require!(
            pool.supported_chains.get(&dest_chain_id).unwrap_or(&false),
            ErrorCode::ChainNotSupported
        );

        // Rate limiting check
        let current_time = Clock::get()?.unix_timestamp;
        if user_position.last_action_timestamp + 900 > current_time {
            return Err(ErrorCode::RateLimited.into());
        }

        // Calculate collateral value and check health factor
        let collateral_price = get_asset_price(&ctx.accounts.collateral_price_feed)?;
        let borrow_price = get_asset_price(&ctx.accounts.borrow_price_feed)?;
        
        let collateral_value = calculate_usd_value(
            user_position.collateral_balance,
            collateral_price,
            asset_info.decimals as u8,
        )?;
        
        let borrow_value = calculate_usd_value(
            amount,
            borrow_price,
            asset_info.decimals as u8,
        )?;

        let new_total_borrow = user_position.total_borrow_value_usd
            .checked_add(borrow_value)
            .ok_or(ErrorCode::MathOverflow)?;

        let health_factor = calculate_health_factor(
            collateral_value,
            new_total_borrow,
            LIQUIDATION_THRESHOLD,
        )?;

        require!(health_factor >= MIN_HEALTH_FACTOR, ErrorCode::HealthFactorTooLow);

        // Create cross-chain message payload
        let message = CrossChainMessage {
            user: ctx.accounts.user.key(),
            action: "borrow".to_string(),
            asset: ctx.accounts.mint.key(),
            amount,
            timestamp: Clock::get()?.unix_timestamp,
            source_chain: 40168, // Solana chain ID
            dest_chain: dest_chain_id,
            receiver,
            nonce: pool.message_nonce,
        };

        let payload = borsh::to_vec(&message)?;
        
        // TODO: Implement actual LayerZero V2 cross-chain message sending
        // This will require:
        // 1. CPI to LayerZero endpoint program
        // 2. Proper account setup for message sending
        // 3. Fee calculation and payment
        // 4. Message verification and signing
        
        // For now, we simulate the cross-chain message sending
        msg!(
            "Cross-chain borrow message prepared for chain {}: user={}, amount={}, payload_len={}",
            dest_chain_id,
            ctx.accounts.user.key(),
            amount,
            payload.len()
        );

        // Update user position
        user_position.borrow_balance = user_position.borrow_balance
            .checked_add(amount)
            .unwrap();
        user_position.total_borrow_value_usd = new_total_borrow;
        user_position.health_factor = health_factor;
        user_position.last_action_timestamp = current_time;

        // Update asset info
        let asset_info = &mut ctx.accounts.asset_info;
        asset_info.total_borrows = asset_info.total_borrows
            .checked_add(amount)
            .unwrap();

        // Increment message nonce
        pool.message_nonce = pool.message_nonce.checked_add(1).unwrap();
        
        emit!(BorrowEvent {
            user: ctx.accounts.user.key(),
            mint: ctx.accounts.mint.key(),
            amount,
            dest_chain: dest_chain_id as u64,
            health_factor,
        });

        emit!(CrossChainMessageSentEvent {
            guid: [0u8; 32], // Placeholder GUID until actual LayerZero integration
            user: ctx.accounts.user.key(),
            action: "borrow".to_string(),
            dest_chain: dest_chain_id as u64,
            nonce: pool.message_nonce - 1,
        });

        msg!("Cross-chain borrow message prepared for LayerZero V2 sending");
        Ok(())
    }

    /// Receive cross-chain message from LayerZero V2
    pub fn layerzero_receive(
        ctx: Context<LayerZeroReceive>,
        src_chain_id: u32,
        guid: [u8; 32],
        payload: Vec<u8>,
    ) -> Result<()> {
        require!(!ctx.accounts.pool.is_paused, ErrorCode::NotAuthorized);
        
        let pool = &mut ctx.accounts.pool;
        
        // Verify the message came from a supported chain
        require!(
            pool.supported_chains.get(&src_chain_id).unwrap_or(&false),
            ErrorCode::ChainNotSupported
        );
        
        // Decode the cross-chain message
        let message: CrossChainMessage = CrossChainMessage::try_from_slice(&payload)
            .map_err(|_| ErrorCode::CrossChainFailed)?;
        
        // Verify message integrity
        let _expected_hash = hash_payload(&payload);
        
        // Process the message based on action type
        match message.action.as_str() {
            "repay" => {
                process_cross_chain_repay(ctx, &message, guid)?;
            },
            "liquidate" => {
                process_cross_chain_liquidation(ctx, &message, guid)?;
            },
            _ => {
                return Err(ErrorCode::CrossChainFailed.into());
            }
        }
        
        emit!(CrossChainMessageReceivedEvent {
            user: message.user,
            action: message.action.clone(),
            amount: message.amount,
            source_chain: src_chain_id as u64,
        });
        
        msg!(
            "LayerZero V2 message received and processed. Action: {}, Amount: {}, GUID: {:?}",
            message.action,
            message.amount,
            guid
        );
        Ok(())
    }

    /// LayerZero V2 lz_receive_types - tells the Executor which accounts are needed by lz_receive
    pub fn lz_receive_types(
        ctx: Context<LzReceiveTypes>,
        params: LzReceiveParams,
    ) -> Result<Vec<u8>> {
        // Return the accounts needed for lz_receive
        // This is called by the LayerZero Executor to determine which accounts to pass
        let accounts = vec![
            // Store account
            ctx.accounts.store.key().to_bytes().to_vec(),
            // Peer account
            ctx.accounts.peer.key().to_bytes().to_vec(),
            // Lending pool account
            ctx.accounts.lending_pool.key().to_bytes().to_vec(),
        ];
        
        let mut result = Vec::new();
        for account in accounts {
            result.extend_from_slice(&account);
        }
        
        msg!("LayerZero V2 lz_receive_types called for src_eid: {}", params.src_eid);
        Ok(result)
    }

    /// LayerZero V2 lz_receive - business logic + Endpoint::clear
    pub fn lz_receive(
        ctx: Context<LzReceive>,
        params: LzReceiveParams,
    ) -> Result<()> {
        // Verify the message came from a supported chain
        require!(
            ctx.accounts.lending_pool.supported_chains.get(&params.src_eid).unwrap_or(&false),
            ErrorCode::ChainNotSupported
        );
        
        // Decode the cross-chain message
        let message: CrossChainMessage = CrossChainMessage::try_from_slice(&params.message)
            .map_err(|_| ErrorCode::CrossChainFailed)?;
        
        // TODO: Implement replay protection via nonce checking
        
        // Process the message based on action type
        match message.action.as_str() {
            "repay" => {
                msg!("Processing cross-chain repay for user: {}, amount: {}", message.user, message.amount);
                // TODO: Implement actual repay logic
            },
            "liquidate" => {
                msg!("Processing cross-chain liquidation for user: {}, amount: {}", message.user, message.amount);
                // TODO: Implement actual liquidation logic
            },
            _ => {
                return Err(ErrorCode::CrossChainFailed.into());
            }
        }
        
        // Call LayerZero endpoint clear to prevent replay attacks
    // This is critical for security - prevents the same message from being processed twice
    layerzero_endpoint_clear(&ctx, &params)?;
        
        emit!(CrossChainMessageReceivedEvent {
            user: message.user,
            action: message.action.clone(),
            amount: message.amount,
            source_chain: params.src_eid as u64,
        });
        
        msg!(
            "LayerZero V2 lz_receive processed successfully - src_eid: {}, action: {}, nonce: {}",
            params.src_eid,
            message.action,
            params.nonce
        );
        
        Ok(())
    }

    /// LayerZero V2 send - sends cross-chain messages via CPI to LayerZero endpoint
    pub fn send(
        ctx: Context<Send>,
        params: SendParams,
    ) -> Result<()> {
        // Verify the destination chain is supported
        require!(
            ctx.accounts.lending_pool.supported_chains.get(&params.dst_eid).unwrap_or(&false),
            ErrorCode::ChainNotSupported
        );
        
        // Calculate message fee via CPI to LayerZero endpoint
        let fee_result = calculate_message_fee(&ctx, &params)?;
        
        // Verify user has sufficient balance for fees
        require!(
            params.native_fee >= fee_result.native_fee,
            ErrorCode::InsufficientFee
        );
        
        // Transfer fee from user to endpoint (if required)
        if fee_result.native_fee > 0 {
            transfer_native_fee(&ctx, fee_result.native_fee)?;
        }
        
        // Call LayerZero endpoint send via CPI
        let cpi_result = layerzero_endpoint_send(&ctx, &params)?;
        
        // Increment nonce
        let pool = &mut ctx.accounts.lending_pool;
        pool.message_nonce = pool.message_nonce.checked_add(1).unwrap();
        
        // Generate GUID from CPI result or create one
        let guid = cpi_result.guid.unwrap_or_else(|| {
            let mut guid = [0u8; 32];
            let nonce_bytes = (pool.message_nonce - 1).to_le_bytes();
            let timestamp_bytes = Clock::get().unwrap().unix_timestamp.to_le_bytes();
            guid[0..8].copy_from_slice(&nonce_bytes);
            guid[8..16].copy_from_slice(&timestamp_bytes);
            guid
        });
        
        emit!(CrossChainMessageSentEvent {
            guid,
            user: ctx.accounts.user.key(),
            action: "send".to_string(),
            dest_chain: params.dst_eid as u64,
            nonce: pool.message_nonce - 1,
        });
        
        msg!(
            "LayerZero V2 message sent successfully - dst_eid: {}, guid: {:?}, fee: {}",
            params.dst_eid,
            guid,
            fee_result.native_fee
        );
        
        Ok(())
    }

    /// Repay borrowed amount
    pub fn repay(ctx: Context<RepayAccounts>, repay_amount: u64) -> Result<()> {
        require!(repay_amount > 0, ErrorCode::InvalidAmount);
        require!(!ctx.accounts.pool.is_paused, ErrorCode::NotAuthorized);

        let user_position = &mut ctx.accounts.user_position;
        require!(user_position.user != Pubkey::default(), ErrorCode::PositionNotFound);
        require!(user_position.borrow_balance >= repay_amount, ErrorCode::InvalidAmount);

        // Rate limiting check
        let current_time = Clock::get()?.unix_timestamp;
        if user_position.last_action_timestamp + 900 > current_time {
            return Err(ErrorCode::RateLimited.into());
        }

        // Transfer tokens from user to pool
        let cpi_accounts = Transfer {
            from: ctx.accounts.user_token_account.to_account_info(),
            to: ctx.accounts.pool_token_account.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, repay_amount)?;

        // Update user position
        user_position.borrow_balance = user_position.borrow_balance
            .checked_sub(repay_amount)
            .unwrap();
        user_position.last_action_timestamp = current_time;

        // Update asset info
        let asset_info = &mut ctx.accounts.asset_info;
        asset_info.total_borrows = asset_info.total_borrows
            .checked_sub(repay_amount)
            .unwrap();

        // Update health factor
        update_health_factor(user_position, &ctx.remaining_accounts)?;

        emit!(RepayEvent {
            user: ctx.accounts.user.key(),
            mint: ctx.accounts.mint.key(),
            amount: repay_amount,
        });

        Ok(())
    }

    /// Withdraw collateral
    pub fn withdraw(ctx: Context<WithdrawAccounts>, amount: u64) -> Result<()> {
        require!(amount > 0, ErrorCode::InvalidAmount);
        require!(!ctx.accounts.pool.is_paused, ErrorCode::NotAuthorized);

        let user_position = &mut ctx.accounts.user_position;
        require!(user_position.collateral_balance >= amount, ErrorCode::InsufficientCollateral);

        // Calculate new collateral value and check health factor
        let price = get_asset_price(&ctx.remaining_accounts[0])?;
        let withdraw_value_usd = calculate_usd_value(amount, price, ctx.accounts.mint.decimals)?;
        
        let new_collateral_value = user_position.total_collateral_value_usd
            .checked_sub(withdraw_value_usd)
            .unwrap();

        let new_health_factor = calculate_health_factor(
            new_collateral_value,
            user_position.total_borrow_value_usd,
            ctx.accounts.asset_info.liquidation_threshold,
        )?;

        require!(new_health_factor >= MIN_HEALTH_FACTOR, ErrorCode::HealthFactorTooLow);

        // Transfer tokens from pool to user
        let seeds = &[b"pool".as_ref(), &[ctx.accounts.pool.bump]];
        let signer = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.pool_token_account.to_account_info(),
            to: ctx.accounts.user_token_account.to_account_info(),
            authority: ctx.accounts.pool.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer);
        token::transfer(cpi_ctx, amount)?;

        // Update user position
        user_position.collateral_balance = user_position.collateral_balance
            .checked_sub(amount)
            .unwrap();
        user_position.total_collateral_value_usd = new_collateral_value;
        user_position.health_factor = new_health_factor;

        // Update asset info
        let asset_info = &mut ctx.accounts.asset_info;
        asset_info.total_deposits = asset_info.total_deposits
            .checked_sub(amount)
            .unwrap();

        emit!(WithdrawEvent {
            user: ctx.accounts.user.key(),
            mint: ctx.accounts.mint.key(),
            amount,
        });

        Ok(())
    }

    /// Liquidate an unhealthy position
    pub fn liquidate(
        ctx: Context<Liquidate>,
        debt_amount: u64,
    ) -> Result<()> {
        require!(debt_amount > 0, ErrorCode::InvalidAmount);

        let borrower_position = &mut ctx.accounts.borrower_position;
        
        let health_factor = calculate_health_factor(
            borrower_position.total_collateral_value_usd,
            borrower_position.total_borrow_value_usd,
            LIQUIDATION_THRESHOLD, // This should come from asset config
        )?;

        require!(health_factor < LIQUIDATION_THRESHOLD, ErrorCode::LiquidationNotAllowed);

        // Prices
        let debt_price = get_asset_price(&ctx.accounts.debt_price_feed)?;
        let collateral_price = get_asset_price(&ctx.accounts.collateral_price_feed)?;

        let collateral_to_seize = calculate_liquidation_amount(
            debt_amount,
            debt_price,
            collateral_price,
            LIQUIDATION_BONUS,
        )?;

        require!(borrower_position.collateral_balance >= collateral_to_seize, ErrorCode::InsufficientCollateral);

        // Transfer debt from liquidator to pool
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.liquidator_debt_account.to_account_info(),
                    to: ctx.accounts.pool_debt_account.to_account_info(),
                    authority: ctx.accounts.liquidator.to_account_info(),
                },
            ),
            debt_amount,
        )?;
        
        // Transfer collateral from pool to liquidator
        let seeds = &[b"pool".as_ref(), &[ctx.accounts.pool.bump]];
        let signer = &[&seeds[..]];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.pool_collateral_account.to_account_info(),
                    to: ctx.accounts.liquidator_collateral_account.to_account_info(),
                    authority: ctx.accounts.pool.to_account_info(),
                },
                signer
            ),
            collateral_to_seize,
        )?;

        // Update borrower's position
        borrower_position.borrow_balance = borrower_position.borrow_balance.checked_sub(debt_amount).unwrap();
        borrower_position.collateral_balance = borrower_position.collateral_balance.checked_sub(collateral_to_seize).unwrap();
        
        // Recalculate and update health factor
        update_health_factor(borrower_position, &ctx.remaining_accounts)?;

        emit!(LiquidationEvent {
            liquidator: ctx.accounts.liquidator.key(),
            borrower: ctx.accounts.borrower.key(),
            debt_amount,
            collateral_seized: collateral_to_seize,
            health_factor: borrower_position.health_factor,
        });

        Ok(())
    }

    pub fn pause(ctx: Context<AdminAction>) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        require!(!pool.is_paused, ErrorCode::NotAuthorized);
        pool.is_paused = true;
        emit!(ProtocolPausedEvent { admin: ctx.accounts.admin.key() });
        Ok(())
    }

    pub fn unpause(ctx: Context<AdminAction>) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        require!(pool.is_paused, ErrorCode::NotAuthorized);
        pool.is_paused = false;
        emit!(ProtocolUnpausedEvent { admin: ctx.accounts.admin.key() });
        Ok(())
    }
}

// LayerZero V2 OApp Store Initialization
#[derive(Accounts)]
pub struct InitOAppStore<'info> {
    #[account(
        init,
        payer = admin,
        space = 8 + 32 + 32 + 1 + 32, // Discriminator + admin + endpoint_program + bump + lending_pool
        seeds = [STORE_SEED],
        bump
    )]
    pub store: Account<'info, OAppStore>,
    #[account(
        init,
        payer = admin,
        space = 8 + 32, // Discriminator + store
        seeds = [LZ_RECEIVE_TYPES_SEED, store.key().as_ref()],
        bump
    )]
    pub lz_receive_types_accounts: Account<'info, LzReceiveTypesAccounts>,
    #[account(
        init,
        payer = admin,
        space = 8 + 32, // Discriminator + store
        seeds = [LZ_COMPOSE_TYPES_SEED, store.key().as_ref()],
        bump
    )]
    pub lz_compose_types_accounts: Account<'info, LzComposeTypesAccounts>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
    /// CHECK: LayerZero endpoint program
    pub layerzero_endpoint: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = admin,
        space = 8 + 32 + 32 + 32 + 32 + 1 + 8 + 8 + 200 + 1, // Discriminator + admin + endpoint + delegate + oapp_store + bool + u64 + u64 + HashMap + bump
        seeds = [b"lending_pool"],
        bump
    )]
    pub pool: Account<'info, LendingPool>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct LendingPool {
    pub admin: Pubkey,
    pub layerzero_endpoint: Pubkey,
    pub delegate: Pubkey,
    pub oapp_store: Pubkey, // Reference to LayerZero OApp Store
    pub is_paused: bool,
    pub total_assets: u64,
    pub supported_chains: HashMap<u32, bool>, // Chain ID -> supported
    pub message_nonce: u64,
    pub bump: u8,
}

#[account]
pub struct OAppStore {
    pub admin: Pubkey,
    pub endpoint_program: Pubkey,
    pub bump: u8,
    // App-specific data for lending pool
    pub lending_pool: Pubkey,
}

#[account]
pub struct PeerConfig {
    pub peer_address: [u8; 32],
    pub bump: u8,
}

#[account]
pub struct LzReceiveTypesAccounts {
    pub store: Pubkey,
}

#[account]
pub struct LzComposeTypesAccounts {
    pub store: Pubkey,
}

#[derive(Accounts)]
pub struct AddSupportedAsset<'info> {
    #[account(mut, has_one = admin)]
    pub pool: Account<'info, LendingPool>,
    #[account(
        init,
        payer = admin,
        space = 8 + 32 + 32 + 8 + 8 + 1 + 1 + 1 + 8 + 8 + 1,
        seeds = [b"asset", mint.key().as_ref()],
        bump
    )]
    pub asset_info: Account<'info, AssetInfo>,
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct AssetInfo {
    pub mint: Pubkey,
    pub price_feed: Pubkey,
    pub ltv: u64,
    pub liquidation_threshold: u64,
    pub is_active: bool,
    pub can_be_collateral: bool,
    pub can_be_borrowed: bool,
    pub total_deposits: u64,
    pub total_borrows: u64,
    pub decimals: u8,
    pub bump: u8,
}

#[derive(Accounts)]
pub struct DepositAccounts<'info> {
    #[account(mut)]
    pub pool: Account<'info, LendingPool>,
    #[account(mut, seeds = [b"asset", mint.key().as_ref()], bump = asset_info.bump)]
    pub asset_info: Account<'info, AssetInfo>,
    #[account(
        init_if_needed,
        payer = user,
        space = 8 + 32 + 8 + 8 + 8 + 8 + 8 + 8 + 1,
        seeds = [b"position", user.key().as_ref(), mint.key().as_ref()],
        bump
    )]
    pub user_position: Account<'info, UserPosition>,
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub pool_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct UserPosition {
    pub user: Pubkey,
    pub collateral_balance: u64,
    pub borrow_balance: u64,
    pub total_collateral_value_usd: u64,
    pub total_borrow_value_usd: u64,
    pub health_factor: u64,
    pub last_action_timestamp: i64,
    pub bump: u8,
}

#[derive(Accounts)]
pub struct BorrowCrossChain<'info> {
    #[account(mut)]
    pub pool: Account<'info, LendingPool>,
    #[account(mut, seeds = [b"asset", mint.key().as_ref()], bump = asset_info.bump)]
    pub asset_info: Account<'info, AssetInfo>,
    #[account(mut, seeds = [b"position", user.key().as_ref(), mint.key().as_ref()], bump = user_position.bump)]
    pub user_position: Account<'info, UserPosition>,
    pub mint: Account<'info, Mint>,
    /// CHECK: Chainlink price feed for collateral
    pub collateral_price_feed: AccountInfo<'info>,
    /// CHECK: Chainlink price feed for borrow asset
    pub borrow_price_feed: AccountInfo<'info>,
    /// CHECK: LayerZero V2 Endpoint Program
    pub layerzero_endpoint: AccountInfo<'info>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

// LayerZero V2 lz_receive_types context
#[derive(Accounts)]
#[instruction(params: LzReceiveParams)]
pub struct LzReceiveTypes<'info> {
    #[account(
        seeds = [STORE_SEED],
        bump = store.bump
    )]
    pub store: Account<'info, OAppStore>,
    #[account(
        seeds = [PEER_SEED, &store.key().to_bytes(), &params.src_eid.to_be_bytes()],
        bump = peer.bump,
        constraint = params.sender == peer.peer_address
    )]
    pub peer: Account<'info, PeerConfig>,
    pub lending_pool: Account<'info, LendingPool>,
}

// LayerZero V2 lz_receive context
#[derive(Accounts)]
#[instruction(params: LzReceiveParams)]
pub struct LzReceive<'info> {
    #[account(
        mut,
        seeds = [STORE_SEED],
        bump = store.bump
    )]
    pub store: Account<'info, OAppStore>,
    #[account(
        seeds = [PEER_SEED, &store.key().to_bytes(), &params.src_eid.to_be_bytes()],
        bump = peer.bump,
        constraint = params.sender == peer.peer_address
    )]
    pub peer: Account<'info, PeerConfig>,
    #[account(mut)]
    pub lending_pool: Account<'info, LendingPool>,
}

// LayerZero V2 send context
#[derive(Accounts)]
#[instruction(params: SendParams)]
pub struct Send<'info> {
    #[account(
        mut,
        seeds = [STORE_SEED],
        bump = store.bump
    )]
    pub store: Account<'info, OAppStore>,
    #[account(
        seeds = [PEER_SEED, &store.key().to_bytes(), &params.dst_eid.to_be_bytes()],
        bump = peer.bump
    )]
    pub peer: Account<'info, PeerConfig>,
    #[account(mut)]
    pub lending_pool: Account<'info, LendingPool>,
    #[account(mut)]
    pub user: Signer<'info>,
    /// CHECK: LayerZero endpoint program
    pub layerzero_endpoint: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct LayerZeroReceive<'info> {
    #[account(mut)]
    pub pool: Account<'info, LendingPool>,
    /// CHECK: User account that will receive the message effects
    pub user: AccountInfo<'info>,
    /// CHECK: LayerZero V2 Endpoint to verify the caller
    pub layerzero_endpoint: AccountInfo<'info>,
    /// CHECK: Message executor (LayerZero)
    pub executor: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}


#[derive(Accounts)]
pub struct RepayAccounts<'info> {
    #[account(mut)]
    pub pool: Account<'info, LendingPool>,
    #[account(mut, seeds = [b"asset", mint.key().as_ref()], bump = asset_info.bump)]
    pub asset_info: Account<'info, AssetInfo>,
    #[account(mut, seeds = [b"position", user.key().as_ref(), mint.key().as_ref()], bump = user_position.bump)]
    pub user_position: Account<'info, UserPosition>,
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub pool_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct WithdrawAccounts<'info> {
    #[account(mut)]
    pub pool: Account<'info, LendingPool>,
    #[account(mut, seeds = [b"asset", mint.key().as_ref()], bump = asset_info.bump)]
    pub asset_info: Account<'info, AssetInfo>,
    #[account(mut, seeds = [b"position", user.key().as_ref(), mint.key().as_ref()], bump = user_position.bump)]
    pub user_position: Account<'info, UserPosition>,
    pub mint: Account<'info, Mint>,
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub pool_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct Liquidate<'info> {
    #[account(mut)]
    pub pool: Account<'info, LendingPool>,
    #[account(mut, seeds = [b"position", borrower.key().as_ref(), debt_mint.key().as_ref()], bump = borrower_position.bump)]
    pub borrower_position: Account<'info, UserPosition>,
    /// CHECK: Borrower account
    pub borrower: AccountInfo<'info>,
    pub debt_mint: Account<'info, Mint>,
    pub collateral_mint: Account<'info, Mint>,
    #[account(mut)]
    pub liquidator_debt_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub liquidator_collateral_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub pool_debt_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub pool_collateral_account: Account<'info, TokenAccount>,
    /// CHECK: Chainlink price feeds
    pub debt_price_feed: AccountInfo<'info>,
    /// CHECK: Chainlink price feeds
    pub collateral_price_feed: AccountInfo<'info>,
    #[account(mut)]
    pub liquidator: Signer<'info>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct AdminAction<'info> {
    #[account(mut, has_one = admin)]
    pub pool: Account<'info, LendingPool>,
    pub admin: Signer<'info>,
}

#[event]
pub struct AssetAddedEvent {
    pub mint: Pubkey,
    pub ltv: u64,
    pub liquidation_threshold: u64,
}

#[event]
pub struct DepositEvent {
    pub user: Pubkey,
    pub mint: Pubkey,
    pub amount: u64,
    pub chain_selector: u64,
}

#[event]
pub struct BorrowEvent {
    pub user: Pubkey,
    pub mint: Pubkey,
    pub amount: u64,
    pub dest_chain: u64,
    pub health_factor: u64,
}

#[event]
pub struct RepayEvent {
    pub user: Pubkey,
    pub mint: Pubkey,
    pub amount: u64,
}

#[event]
pub struct WithdrawEvent {
    pub user: Pubkey,
    pub mint: Pubkey,
    pub amount: u64,
}

#[event]
pub struct LiquidationEvent {
    pub liquidator: Pubkey,
    pub borrower: Pubkey,
    pub debt_amount: u64,
    pub collateral_seized: u64,
    pub health_factor: u64,
}

#[event]
pub struct CrossChainMessageReceivedEvent {
    pub user: Pubkey,
    pub action: String,
    pub amount: u64,
    pub source_chain: u64,
}

#[event]
pub struct ProtocolPausedEvent {
    pub admin: Pubkey,
}

#[event]
pub struct ProtocolUnpausedEvent {
    pub admin: Pubkey,
}

#[event]
pub struct CrossChainMessageSentEvent {
    pub guid: [u8; 32],
    pub user: Pubkey,
    pub action: String,
    pub dest_chain: u64,
    pub nonce: u64,
}

// Helper functions

fn get_asset_price(_price_feed: &AccountInfo) -> Result<u64> {
    // Placeholder - in a real implementation, this would fetch the price from a Chainlink feed
    Ok(100_000_000_000_000_000) // $100 with 1e18 precision (100 * 1e18)
}

fn calculate_usd_value(amount: u64, price: u64, decimals: u8) -> Result<u64> {
    Ok(amount
        .checked_mul(price)
        .unwrap()
        .checked_div(10u64.pow(decimals as u32))
        .unwrap())
}

fn calculate_health_factor(
    total_collateral_value_usd: u64,
    total_borrow_value_usd: u64,
    liquidation_threshold: u64,
) -> Result<u64> {
    if total_borrow_value_usd == 0 {
        return Ok(u64::MAX);
    }
    Ok(total_collateral_value_usd
        .checked_mul(liquidation_threshold)
        .unwrap()
        .checked_div(total_borrow_value_usd)
        .unwrap())
}

fn calculate_liquidation_amount(
    debt_amount: u64,
    debt_price: u64,
    collateral_price: u64,
    liquidation_bonus: u64,
) -> Result<u64> {
    let debt_value = debt_amount.checked_mul(debt_price).unwrap();
    let bonus = debt_value.checked_mul(liquidation_bonus).unwrap().checked_div(PRECISION).unwrap();
    let total_value_to_seize = debt_value.checked_add(bonus).unwrap();
    
    Ok(total_value_to_seize.checked_div(collateral_price).unwrap())
}


fn update_health_factor(
    user_position: &mut UserPosition,
    _remaining_accounts: &[AccountInfo],
) -> Result<()> {
    // This is a simplified version. A real implementation would need to iterate
    // over all collateral and borrow positions to get the total USD values.
    // For now, we assume these values are already correctly updated on the position.
    user_position.health_factor = calculate_health_factor(
        user_position.total_collateral_value_usd,
        user_position.total_borrow_value_usd,
        LIQUIDATION_THRESHOLD, // This should come from the specific asset being used
    )?;
    Ok(())
}

// LayerZero V2 Cross-chain message processing functions
fn process_cross_chain_repay(
    _ctx: Context<LayerZeroReceive>,
    message: &CrossChainMessage,
    _guid: [u8; 32],
) -> Result<()> {
    // Find user position and update repayment
    // This is a simplified implementation
    msg!(
        "Processing cross-chain repay for user: {}, amount: {}",
        message.user,
        message.amount
    );
    
    // In a real implementation, you would:
    // 1. Find the user's position
    // 2. Reduce their borrow balance
    // 3. Update health factor
    // 4. Burn synthetic tokens if applicable
    
    Ok(())
}

fn process_cross_chain_liquidation(
    _ctx: Context<LayerZeroReceive>,
    message: &CrossChainMessage,
    _guid: [u8; 32],
) -> Result<()> {
    // Process liquidation from another chain
    msg!(
        "Processing cross-chain liquidation for user: {}, amount: {}",
        message.user,
        message.amount
    );
    
    // In a real implementation, you would:
    // 1. Verify liquidation conditions
    // 2. Transfer collateral to liquidator
    // 3. Reduce borrower's debt
    // 4. Update positions
    
    Ok(())
}

// Hash payload for message integrity verification
fn hash_payload(payload: &[u8]) -> [u8; 32] {
    use solana_program::keccak;
    keccak::hash(payload).to_bytes()
}

// LayerZero V2 CPI helper structures
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct MessageFeeResult {
    pub native_fee: u64,
    pub lz_token_fee: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct SendResult {
    pub guid: Option<[u8; 32]>,
    pub nonce: u64,
}

// LayerZero V2 CPI helper functions
fn calculate_message_fee(
    _ctx: &Context<Send>,
    params: &SendParams,
) -> Result<MessageFeeResult> {
    // In a real implementation, this would make a CPI call to the LayerZero endpoint
    // to calculate the actual message fee based on destination chain, message size, etc.
    
    // For now, return a placeholder fee calculation
    let base_fee = 1000000; // 0.001 SOL in lamports
    let message_size_fee = (params.message.len() as u64) * 100; // 100 lamports per byte
    
    Ok(MessageFeeResult {
        native_fee: base_fee + message_size_fee,
        lz_token_fee: 0, // No LZ token fee for this example
    })
}

fn transfer_native_fee(
    _ctx: &Context<Send>,
    fee_amount: u64,
) -> Result<()> {
    // In a real implementation, this would transfer SOL from user to LayerZero endpoint
    // For now, we'll just log the fee transfer
    msg!("Transferring native fee: {} lamports to LayerZero endpoint", fee_amount);
    
    // TODO: Implement actual SOL transfer via system program
    // let transfer_instruction = system_instruction::transfer(
    //     &ctx.accounts.user.key(),
    //     &ctx.accounts.layerzero_endpoint.key(),
    //     fee_amount,
    // );
    // invoke(&transfer_instruction, &[ctx.accounts.user.to_account_info(), ctx.accounts.layerzero_endpoint.clone()])?;
    
    Ok(())
}

fn layerzero_endpoint_send(
    ctx: &Context<Send>,
    params: &SendParams,
) -> Result<SendResult> {
    // In a real implementation, this would make a CPI call to the LayerZero endpoint program
    // The actual implementation would look something like:
    
    /*
    let cpi_program = ctx.accounts.layerzero_endpoint.to_account_info();
    let cpi_accounts = layerzero_endpoint::cpi::accounts::Send {
        sender: ctx.accounts.store.to_account_info(),
        peer: ctx.accounts.peer.to_account_info(),
        // ... other required accounts
    };
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    
    let send_params = layerzero_endpoint::SendParams {
        dst_eid: params.dst_eid,
        receiver: params.receiver,
        message: params.message.clone(),
        options: params.options.clone(),
        native_fee: params.native_fee,
        lz_token_fee: params.lz_token_fee,
    };
    
    let result = layerzero_endpoint::cpi::send(cpi_ctx, send_params)?;
    */
    
    // For now, return a mock result
    msg!(
        "LayerZero V2 CPI send - dst_eid: {}, message_len: {}, fee: {}",
        params.dst_eid,
        params.message.len(),
        params.native_fee
    );
    
    // Generate a mock GUID
    let mut guid = [0u8; 32];
    let timestamp = Clock::get()?.unix_timestamp;
    let timestamp_bytes = timestamp.to_le_bytes();
    guid[0..8].copy_from_slice(&timestamp_bytes);
    guid[8..12].copy_from_slice(&params.dst_eid.to_le_bytes());
    
    Ok(SendResult {
        guid: Some(guid),
        nonce: ctx.accounts.lending_pool.message_nonce + 1,
    })
}

/// LayerZero V2 endpoint clear - clears processed messages to prevent replay
fn layerzero_endpoint_clear(
    _ctx: &Context<LzReceive>,
    params: &LzReceiveParams,
) -> Result<()> {
    // In a real implementation, this would make a CPI call to clear the message
    // from the LayerZero endpoint to prevent replay attacks
    
    /*
    let cpi_program = ctx.accounts.layerzero_endpoint.to_account_info();
    let cpi_accounts = layerzero_endpoint::cpi::accounts::Clear {
        store: ctx.accounts.store.to_account_info(),
        peer: ctx.accounts.peer.to_account_info(),
        // ... other required accounts
    };
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    
    let clear_params = layerzero_endpoint::ClearParams {
        src_eid: params.src_eid,
        sender: params.sender,
        nonce: params.nonce,
    };
    
    layerzero_endpoint::cpi::clear(cpi_ctx, clear_params)?;
    */
    
    msg!(
        "LayerZero V2 CPI clear - src_eid: {}, sender: {:?}, nonce: {}",
        params.src_eid,
        params.sender,
        params.nonce
    );
    
    Ok(())
}
