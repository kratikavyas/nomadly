#![no_std]
use soroban_sdk::{contract, contractimpl, contracttype, token, Address, Env, Vec, String};

#[contracttype]
#[derive(Clone, Debug, Eq, PartialEq)]
pub enum BookingStatus { Confirmed, Cancelled, Completed }

#[contracttype]
#[derive(Clone)]
pub struct Experience {
    pub id: u64,
    pub host: Address,
    pub title: String,
    pub description: String,
    pub location: String,
    pub category: String,
    pub price: i128,
    pub max_participants: u32,
    pub active: bool,
}

#[contracttype]
#[derive(Clone)]
pub struct Booking {
    pub id: u64,
    pub experience_id: u64,
    pub traveler: Address,
    pub num_participants: u32,
    pub total_paid: i128,
    pub token: Address,
    pub status: BookingStatus,
}

#[contracttype]
#[derive(Clone)]
pub struct Review {
    pub id: u64,
    pub experience_id: u64,
    pub traveler: Address,
    pub rating: u32,
    pub comment: String,
}

#[contracttype]
enum Key {
    Platform, Fee, NextExpId, NextBookId, NextRevId,
    Exp(u64), Book(u64), Rev(u64),
    HostExps(Address), TravelerBooks(Address), ExpRevs(u64),
}

#[contract]
pub struct Nomadly;

#[contractimpl]
impl Nomadly {
    pub fn __constructor(env: Env, platform: Address) {
        let s = env.storage().instance();
        s.set(&Key::Platform, &platform);
        s.set(&Key::Fee, &5u32);
        s.set(&Key::NextExpId, &1u64);
        s.set(&Key::NextBookId, &1u64);
        s.set(&Key::NextRevId, &1u64);
    }

    // ── Experiences ──────────────────────────────────────

    pub fn create_experience(
        env: Env, host: Address, title: String, description: String,
        location: String, category: String, price: i128, max_participants: u32,
    ) -> u64 {
        host.require_auth();
        let id: u64 = env.storage().instance().get(&Key::NextExpId).unwrap();
        env.storage().persistent().set(&Key::Exp(id), &Experience {
            id, host: host.clone(), title, description, location, category, price, max_participants, active: true,
        });
        let mut list: Vec<u64> = env.storage().persistent()
            .get(&Key::HostExps(host.clone())).unwrap_or(Vec::new(&env));
        list.push_back(id);
        env.storage().persistent().set(&Key::HostExps(host), &list);
        env.storage().instance().set(&Key::NextExpId, &(id + 1));
        id
    }

    pub fn update_experience(
        env: Env, host: Address, id: u64, title: String, description: String,
        location: String, category: String, price: i128, max_participants: u32,
    ) {
        host.require_auth();
        let mut e: Experience = env.storage().persistent().get(&Key::Exp(id)).expect("Experience not found");
        assert!(e.host == host, "Only host can update");
        e.title = title; e.description = description; e.location = location;
        e.category = category; e.price = price; e.max_participants = max_participants;
        env.storage().persistent().set(&Key::Exp(id), &e);
    }

    pub fn deactivate_experience(env: Env, host: Address, id: u64) {
        host.require_auth();
        let mut e: Experience = env.storage().persistent().get(&Key::Exp(id)).expect("Experience not found");
        assert!(e.host == host, "Only host can update");
        e.active = false;
        env.storage().persistent().set(&Key::Exp(id), &e);
    }

    pub fn get_experience(env: Env, id: u64) -> Experience {
        env.storage().persistent().get(&Key::Exp(id)).expect("Experience not found")
    }

    pub fn get_host_experiences(env: Env, host: Address) -> Vec<u64> {
        env.storage().persistent().get(&Key::HostExps(host)).unwrap_or(Vec::new(&env))
    }

    pub fn get_all_experiences(env: Env) -> Vec<u64> {
        let next: u64 = env.storage().instance().get(&Key::NextExpId).unwrap_or(1);
        let mut all = Vec::new(&env);
        let mut i = 1u64;
        while i < next {
            if env.storage().persistent().has(&Key::Exp(i)) { all.push_back(i); }
            i += 1;
        }
        all
    }

    // ── Bookings ─────────────────────────────────────────

    pub fn book_experience(
        env: Env, traveler: Address, experience_id: u64, token_addr: Address, num_participants: u32,
    ) -> u64 {
        traveler.require_auth();
        let e: Experience = env.storage().persistent().get(&Key::Exp(experience_id)).expect("Experience not found");
        assert!(e.active, "Experience not available");
        assert!(num_participants > 0 && num_participants <= e.max_participants, "Too many participants");
        let total = e.price * (num_participants as i128);
        token::Client::new(&env, &token_addr).transfer(&traveler, &env.current_contract_address(), &total);
        let id: u64 = env.storage().instance().get(&Key::NextBookId).unwrap();
        env.storage().persistent().set(&Key::Book(id), &Booking {
            id, experience_id, traveler: traveler.clone(), num_participants, total_paid: total, token: token_addr, status: BookingStatus::Confirmed,
        });
        let mut list: Vec<u64> = env.storage().persistent()
            .get(&Key::TravelerBooks(traveler.clone())).unwrap_or(Vec::new(&env));
        list.push_back(id);
        env.storage().persistent().set(&Key::TravelerBooks(traveler), &list);
        env.storage().instance().set(&Key::NextBookId, &(id + 1));
        id
    }

    pub fn cancel_booking(env: Env, caller: Address, booking_id: u64) {
        caller.require_auth();
        let mut b: Booking = env.storage().persistent().get(&Key::Book(booking_id)).expect("Booking not found");
        assert!(b.status == BookingStatus::Confirmed, "Booking not cancellable");
        let e: Experience = env.storage().persistent().get(&Key::Exp(b.experience_id)).expect("Experience not found");
        assert!(b.traveler == caller || e.host == caller, "Not authorized to cancel");
        token::Client::new(&env, &b.token).transfer(&env.current_contract_address(), &b.traveler, &b.total_paid);
        b.status = BookingStatus::Cancelled;
        env.storage().persistent().set(&Key::Book(booking_id), &b);
    }

    pub fn complete_booking(env: Env, host: Address, booking_id: u64) {
        host.require_auth();
        let mut b: Booking = env.storage().persistent().get(&Key::Book(booking_id)).expect("Booking not found");
        assert!(b.status == BookingStatus::Confirmed, "Booking not active");
        let e: Experience = env.storage().persistent().get(&Key::Exp(b.experience_id)).expect("Experience not found");
        assert!(e.host == host, "Only host can complete");
        let fee_pct: u32 = env.storage().instance().get(&Key::Fee).unwrap();
        let fee = b.total_paid * (fee_pct as i128) / 100;
        let to_host = b.total_paid - fee;
        let tc = token::Client::new(&env, &b.token);
        tc.transfer(&env.current_contract_address(), &e.host, &to_host);
        if fee > 0 {
            let platform: Address = env.storage().instance().get(&Key::Platform).unwrap();
            tc.transfer(&env.current_contract_address(), &platform, &fee);
        }
        b.status = BookingStatus::Completed;
        env.storage().persistent().set(&Key::Book(booking_id), &b);
    }

    pub fn get_booking(env: Env, id: u64) -> Booking {
        env.storage().persistent().get(&Key::Book(id)).expect("Booking not found")
    }

    pub fn get_traveler_bookings(env: Env, traveler: Address) -> Vec<u64> {
        env.storage().persistent().get(&Key::TravelerBooks(traveler)).unwrap_or(Vec::new(&env))
    }

    // ── Reviews ──────────────────────────────────────────

    pub fn add_review(env: Env, traveler: Address, booking_id: u64, rating: u32, comment: String) -> u64 {
        traveler.require_auth();
        assert!((1..=5).contains(&rating), "Rating must be 1-5");
        let b: Booking = env.storage().persistent().get(&Key::Book(booking_id)).expect("Booking not found");
        assert!(b.status == BookingStatus::Completed, "Booking not completed");
        assert!(b.traveler == traveler, "Only the traveler who booked");
        let id: u64 = env.storage().instance().get(&Key::NextRevId).unwrap();
        env.storage().persistent().set(&Key::Rev(id), &Review {
            id, experience_id: b.experience_id, traveler: traveler.clone(), rating, comment,
        });
        let mut list: Vec<u64> = env.storage().persistent()
            .get(&Key::ExpRevs(b.experience_id)).unwrap_or(Vec::new(&env));
        list.push_back(id);
        env.storage().persistent().set(&Key::ExpRevs(b.experience_id), &list);
        env.storage().instance().set(&Key::NextRevId, &(id + 1));
        id
    }

    pub fn get_review(env: Env, id: u64) -> Review {
        env.storage().persistent().get(&Key::Rev(id)).expect("Review not found")
    }

    pub fn get_experience_reviews(env: Env, experience_id: u64) -> Vec<u64> {
        env.storage().persistent().get(&Key::ExpRevs(experience_id)).unwrap_or(Vec::new(&env))
    }

    // ── Platform ─────────────────────────────────────────

    pub fn set_platform_fee(env: Env, platform: Address, fee_pct: u32) {
        platform.require_auth();
        let admin: Address = env.storage().instance().get(&Key::Platform).unwrap();
        assert!(admin == platform, "Only platform admin");
        env.storage().instance().set(&Key::Fee, &fee_pct);
    }

    pub fn get_platform_fee(env: Env) -> u32 {
        env.storage().instance().get(&Key::Fee).unwrap()
    }
}

mod test;
