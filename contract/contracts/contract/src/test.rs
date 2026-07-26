#![cfg(test)]
use super::*;
use soroban_sdk::{testutils::Address as _, Address, Env, String};
use soroban_sdk::token::{Client as TokenClient, StellarAssetClient};

fn create_token<'a>(env: &Env, admin: &Address) -> (Address, TokenClient<'a>, StellarAssetClient<'a>) {
    let asset = env.register_stellar_asset_contract_v2(admin.clone());
    let addr = asset.address();
    (addr.clone(), TokenClient::new(env, &addr), StellarAssetClient::new(env, &addr))
}

fn setup(env: &Env) -> (Address, NomadlyClient<'_>) {
    let platform = Address::generate(env);
    let id = env.register(Nomadly, (&platform,));
    (platform, NomadlyClient::new(env, &id))
}

fn make_experience(env: &Env, client: &NomadlyClient<'_>, host: &Address) -> u64 {
    client.create_experience(
        host,
        &String::from_str(env, "Tokyo Food Tour"),
        &String::from_str(env, "Ramen and sushi walk through Shibuya"),
        &String::from_str(env, "Shibuya, Tokyo"),
        &String::from_str(env, "food_tour"),
        &5000i128,
        &8u32,
    )
}

// ===== Experience Tests =====

#[test]
fn test_create_experience() {
    let env = Env::default();
    env.mock_all_auths();
    let (_, client) = setup(&env);
    let host = Address::generate(&env);

    let id = client.create_experience(
        &host,
        &String::from_str(&env, "Kyoto Temple Walk"),
        &String::from_str(&env, "Visit ancient temples"),
        &String::from_str(&env, "Higashiyama, Kyoto"),
        &String::from_str(&env, "cultural"),
        &3000i128,
        &12u32,
    );

    assert_eq!(id, 1);
    let exp = client.get_experience(&id);
    assert_eq!(exp.title, String::from_str(&env, "Kyoto Temple Walk"));
    assert_eq!(exp.host, host);
    assert_eq!(exp.price, 3000i128);
    assert!(exp.active);
}

#[test]
fn test_create_multiple_experiences() {
    let env = Env::default();
    env.mock_all_auths();
    let (_, client) = setup(&env);
    let host = Address::generate(&env);

    let id1 = make_experience(&env, &client, &host);
    let id2 = client.create_experience(
        &host,
        &String::from_str(&env, "Photo Walk"),
        &String::from_str(&env, "Capture neon streets"),
        &String::from_str(&env, "Dotonbori, Osaka"),
        &String::from_str(&env, "photography"),
        &2000i128,
        &5u32,
    );

    assert_eq!(id1, 1);
    assert_eq!(id2, 2);
    assert_eq!(client.get_host_experiences(&host).len(), 2);
}

#[test]
fn test_update_experience() {
    let env = Env::default();
    env.mock_all_auths();
    let (_, client) = setup(&env);
    let host = Address::generate(&env);

    make_experience(&env, &client, &host);
    client.update_experience(
        &host, &1,
        &String::from_str(&env, "Updated Tour"),
        &String::from_str(&env, "New description"),
        &String::from_str(&env, "Osaka"),
        &String::from_str(&env, "hike"),
        &8000i128,
        &10u32,
    );

    let exp = client.get_experience(&1);
    assert_eq!(exp.title, String::from_str(&env, "Updated Tour"));
    assert_eq!(exp.price, 8000i128);
}

#[test]
#[should_panic(expected = "Only host can update")]
fn test_update_wrong_host() {
    let env = Env::default();
    env.mock_all_auths();
    let (_, client) = setup(&env);
    let host = Address::generate(&env);
    let other = Address::generate(&env);

    make_experience(&env, &client, &host);
    client.update_experience(
        &other, &1,
        &String::from_str(&env, "Hack"),
        &String::from_str(&env, "Desc"),
        &String::from_str(&env, "Tokyo"),
        &String::from_str(&env, "food_tour"),
        &1000i128,
        &1u32,
    );
}

#[test]
fn test_deactivate_experience() {
    let env = Env::default();
    env.mock_all_auths();
    let (_, client) = setup(&env);
    let host = Address::generate(&env);

    make_experience(&env, &client, &host);
    client.deactivate_experience(&host, &1);
    assert!(!client.get_experience(&1).active);
}

#[test]
#[should_panic(expected = "Experience not found")]
fn test_get_nonexistent_experience() {
    let env = Env::default();
    let (_, client) = setup(&env);
    client.get_experience(&999);
}

#[test]
fn test_get_all_experiences() {
    let env = Env::default();
    env.mock_all_auths();
    let (_, client) = setup(&env);
    let h1 = Address::generate(&env);
    let h2 = Address::generate(&env);

    make_experience(&env, &client, &h1);
    client.create_experience(
        &h2,
        &String::from_str(&env, "Sushi Class"),
        &String::from_str(&env, "Learn to make sushi"),
        &String::from_str(&env, "Tokyo"),
        &String::from_str(&env, "workshop"),
        &7000i128,
        &6u32,
    );

    assert_eq!(client.get_all_experiences().len(), 2);
}

// ===== Booking Tests =====

#[test]
fn test_book_experience() {
    let env = Env::default();
    env.mock_all_auths();
    let (platform, client) = setup(&env);
    let host = Address::generate(&env);
    let traveler = Address::generate(&env);
    let (_, token, admin) = create_token(&env, &platform);

    make_experience(&env, &client, &host);
    admin.mint(&traveler, &20000i128);

    let booking_id = client.book_experience(&traveler, &1, &token.address, &2u32);
    assert_eq!(booking_id, 1);

    let b = client.get_booking(&booking_id);
    assert_eq!(b.traveler, traveler);
    assert_eq!(b.total_paid, 10000i128);
    assert_eq!(b.status, BookingStatus::Confirmed);
}

#[test]
fn test_escrow_and_release() {
    let env = Env::default();
    env.mock_all_auths();
    let (platform_addr, client) = setup(&env);
    let host = Address::generate(&env);
    let traveler = Address::generate(&env);
    let (_, token, admin) = create_token(&env, &platform_addr);

    client.create_experience(
        &host,
        &String::from_str(&env, "Tour"),
        &String::from_str(&env, "Desc"),
        &String::from_str(&env, "Tokyo"),
        &String::from_str(&env, "food_tour"),
        &10000i128,
        &4u32,
    );

    admin.mint(&traveler, &50000i128);
    admin.mint(&host, &0i128);
    admin.mint(&platform_addr, &0i128);

    client.book_experience(&traveler, &1, &token.address, &3u32);
    assert_eq!(token.balance(&traveler), 20000i128);
    assert_eq!(token.balance(&host), 0i128);

    // Complete: host gets 95%, platform gets 5%
    client.complete_booking(&host, &1);
    assert_eq!(token.balance(&host), 28500i128);
    assert_eq!(token.balance(&platform_addr), 1500i128);
}

#[test]
#[should_panic(expected = "Experience not available")]
fn test_book_inactive_experience() {
    let env = Env::default();
    env.mock_all_auths();
    let (platform, client) = setup(&env);
    let host = Address::generate(&env);
    let traveler = Address::generate(&env);
    let (token_addr, _, admin) = create_token(&env, &platform);

    make_experience(&env, &client, &host);
    admin.mint(&traveler, &20000i128);
    client.deactivate_experience(&host, &1);
    client.book_experience(&traveler, &1, &token_addr, &2u32);
}

#[test]
#[should_panic(expected = "Too many participants")]
fn test_book_over_capacity() {
    let env = Env::default();
    env.mock_all_auths();
    let (platform, client) = setup(&env);
    let host = Address::generate(&env);
    let traveler = Address::generate(&env);
    let (token_addr, _, admin) = create_token(&env, &platform);

    client.create_experience(
        &host,
        &String::from_str(&env, "Tour"),
        &String::from_str(&env, "Desc"),
        &String::from_str(&env, "Tokyo"),
        &String::from_str(&env, "food_tour"),
        &5000i128,
        &2u32,
    );
    admin.mint(&traveler, &50000i128);
    client.book_experience(&traveler, &1, &token_addr, &5u32);
}

// ===== Cancel Tests =====

#[test]
fn test_cancel_by_traveler() {
    let env = Env::default();
    env.mock_all_auths();
    let (platform_addr, client) = setup(&env);
    let host = Address::generate(&env);
    let traveler = Address::generate(&env);
    let (_, token, admin) = create_token(&env, &platform_addr);

    make_experience(&env, &client, &host);
    admin.mint(&traveler, &50000i128);
    client.book_experience(&traveler, &1, &token.address, &2u32);
    // Traveler paid 10000 into escrow (5000 * 2)
    assert_eq!(token.balance(&traveler), 40000i128);

    client.cancel_booking(&traveler, &1);
    assert_eq!(token.balance(&traveler), 50000i128);
    assert_eq!(client.get_booking(&1).status, BookingStatus::Cancelled);
}

#[test]
fn test_cancel_by_host() {
    let env = Env::default();
    env.mock_all_auths();
    let (platform_addr, client) = setup(&env);
    let host = Address::generate(&env);
    let traveler = Address::generate(&env);
    let (_, token, admin) = create_token(&env, &platform_addr);

    make_experience(&env, &client, &host);
    admin.mint(&traveler, &50000i128);
    client.book_experience(&traveler, &1, &token.address, &2u32);
    client.cancel_booking(&host, &1);
    assert_eq!(client.get_booking(&1).status, BookingStatus::Cancelled);
}

#[test]
#[should_panic(expected = "Not authorized to cancel")]
fn test_cancel_unauthorized() {
    let env = Env::default();
    env.mock_all_auths();
    let (platform, client) = setup(&env);
    let host = Address::generate(&env);
    let traveler = Address::generate(&env);
    let stranger = Address::generate(&env);
    let (token_addr, _, admin) = create_token(&env, &platform);

    make_experience(&env, &client, &host);
    admin.mint(&traveler, &20000i128);
    client.book_experience(&traveler, &1, &token_addr, &2u32);
    client.cancel_booking(&stranger, &1);
}

// ===== Complete Tests =====

#[test]
fn test_complete_booking() {
    let env = Env::default();
    env.mock_all_auths();
    let (platform, client) = setup(&env);
    let host = Address::generate(&env);
    let traveler = Address::generate(&env);
    let (token_addr, _, admin) = create_token(&env, &platform);

    make_experience(&env, &client, &host);
    admin.mint(&traveler, &20000i128);
    client.book_experience(&traveler, &1, &token_addr, &2u32);
    client.complete_booking(&host, &1);
    assert_eq!(client.get_booking(&1).status, BookingStatus::Completed);
}

#[test]
#[should_panic(expected = "Only host can complete")]
fn test_complete_wrong_host() {
    let env = Env::default();
    env.mock_all_auths();
    let (platform, client) = setup(&env);
    let host = Address::generate(&env);
    let traveler = Address::generate(&env);
    let stranger = Address::generate(&env);
    let (token_addr, _, admin) = create_token(&env, &platform);

    make_experience(&env, &client, &host);
    admin.mint(&traveler, &20000i128);
    client.book_experience(&traveler, &1, &token_addr, &2u32);
    client.complete_booking(&stranger, &1);
}

// ===== Review Tests =====

#[test]
fn test_add_review() {
    let env = Env::default();
    env.mock_all_auths();
    let (platform, client) = setup(&env);
    let host = Address::generate(&env);
    let traveler = Address::generate(&env);
    let (token_addr, _, admin) = create_token(&env, &platform);

    make_experience(&env, &client, &host);
    admin.mint(&traveler, &20000i128);
    client.book_experience(&traveler, &1, &token_addr, &2u32);
    client.complete_booking(&host, &1);

    let rid = client.add_review(
        &traveler, &1, &5u32,
        &String::from_str(&env, "Incredible! Best ramen of my life."),
    );
    assert_eq!(rid, 1);

    let r = client.get_review(&rid);
    assert_eq!(r.rating, 5);
    assert_eq!(r.comment, String::from_str(&env, "Incredible! Best ramen of my life."));
    assert_eq!(r.traveler, traveler);
}

#[test]
#[should_panic(expected = "Booking not completed")]
fn test_review_before_completion() {
    let env = Env::default();
    env.mock_all_auths();
    let (platform, client) = setup(&env);
    let host = Address::generate(&env);
    let traveler = Address::generate(&env);
    let (token_addr, _, admin) = create_token(&env, &platform);

    make_experience(&env, &client, &host);
    admin.mint(&traveler, &20000i128);
    client.book_experience(&traveler, &1, &token_addr, &2u32);
    client.add_review(&traveler, &1, &5u32, &String::from_str(&env, "Nice"));
}

#[test]
#[should_panic(expected = "Only the traveler who booked")]
fn test_review_wrong_traveler() {
    let env = Env::default();
    env.mock_all_auths();
    let (platform, client) = setup(&env);
    let host = Address::generate(&env);
    let traveler = Address::generate(&env);
    let stranger = Address::generate(&env);
    let (token_addr, _, admin) = create_token(&env, &platform);

    make_experience(&env, &client, &host);
    admin.mint(&traveler, &20000i128);
    client.book_experience(&traveler, &1, &token_addr, &2u32);
    client.complete_booking(&host, &1);
    client.add_review(&stranger, &1, &4u32, &String::from_str(&env, "Good"));
}

#[test]
#[should_panic(expected = "Rating must be 1-5")]
fn test_review_invalid_rating() {
    let env = Env::default();
    env.mock_all_auths();
    let (platform, client) = setup(&env);
    let host = Address::generate(&env);
    let traveler = Address::generate(&env);
    let (token_addr, _, admin) = create_token(&env, &platform);

    make_experience(&env, &client, &host);
    admin.mint(&traveler, &20000i128);
    client.book_experience(&traveler, &1, &token_addr, &2u32);
    client.complete_booking(&host, &1);
    client.add_review(&traveler, &1, &0u32, &String::from_str(&env, "Bad"));
}

#[test]
fn test_get_experience_reviews() {
    let env = Env::default();
    env.mock_all_auths();
    let (platform, client) = setup(&env);
    let host = Address::generate(&env);
    let t1 = Address::generate(&env);
    let t2 = Address::generate(&env);
    let (_, token, admin) = create_token(&env, &platform);

    make_experience(&env, &client, &host);
    admin.mint(&t1, &20000i128);
    admin.mint(&t2, &20000i128);

    client.book_experience(&t1, &1, &token.address, &1u32);
    client.complete_booking(&host, &1);
    client.add_review(&t1, &1, &5u32, &String::from_str(&env, "Loved it!"));

    client.book_experience(&t2, &1, &token.address, &1u32);
    client.complete_booking(&host, &2);
    client.add_review(&t2, &2, &4u32, &String::from_str(&env, "Very good"));

    assert_eq!(client.get_experience_reviews(&1).len(), 2);
}

// ===== Platform Fee Tests =====

#[test]
fn test_platform_fee_default() {
    let env = Env::default();
    let (_, client) = setup(&env);
    assert_eq!(client.get_platform_fee(), 5);
}

#[test]
fn test_set_platform_fee() {
    let env = Env::default();
    env.mock_all_auths();
    let (platform, client) = setup(&env);
    client.set_platform_fee(&platform, &10);
    assert_eq!(client.get_platform_fee(), 10);
}

#[test]
#[should_panic(expected = "Only platform admin")]
fn test_set_fee_unauthorized() {
    let env = Env::default();
    env.mock_all_auths();
    let (_, client) = setup(&env);
    let stranger = Address::generate(&env);
    client.set_platform_fee(&stranger, &10);
}

// ===== Traveler Bookings =====

#[test]
fn test_get_traveler_bookings() {
    let env = Env::default();
    env.mock_all_auths();
    let (platform, client) = setup(&env);
    let host = Address::generate(&env);
    let traveler = Address::generate(&env);
    let (_, token, admin) = create_token(&env, &platform);

    make_experience(&env, &client, &host);
    client.create_experience(
        &host,
        &String::from_str(&env, "Sushi Class"),
        &String::from_str(&env, "Make your own"),
        &String::from_str(&env, "Osaka"),
        &String::from_str(&env, "workshop"),
        &3000i128,
        &6u32,
    );

    admin.mint(&traveler, &50000i128);
    client.book_experience(&traveler, &1, &token.address, &2u32);
    client.book_experience(&traveler, &2, &token.address, &1u32);

    assert_eq!(client.get_traveler_bookings(&traveler).len(), 2);
}
