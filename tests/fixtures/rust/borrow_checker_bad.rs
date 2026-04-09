// Hero fixture for the Rust language pack.
//
// Intentional bugs seeded for /challenge:
//   1. `rust:unwrap-everywhere`       — raw .unwrap()s on fallible I/O
//   2. `rust:string-vs-str`           — parameter is `String` where `&str` would do
//   3. `rust:vec-vs-slice`            — parameter is `Vec<User>` where `&[User]` would do
//   4. `rust:iterator-chains`         — hand-rolled loop building a Vec
//   5. `rust:clone-to-appease-borrow-checker` — unnecessary .clone() on String/Vec
//
// This file is NOT meant to be idiomatic. Treat it as a practice target.

use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone)]
pub struct User {
    pub id: u64,
    pub name: String,
    pub email: String,
    pub active: bool,
}

/// Loads users from a TOML file and returns the active ones whose name matches `prefix`.
///
/// Bugs:
///  - `.unwrap()` on both `fs::read_to_string` and `toml::from_str` — panics on any error.
///  - `name_prefix: String` forces the caller to allocate a `String`.
///  - `users: Vec<User>` parameter in the helper below forces an owned `Vec`.
///  - Hand-rolled loop that pushes into a `Vec` instead of using iterator adapters.
///  - `.clone()` on the whole `users` vector just to avoid a borrow.
pub fn load_active_users(config_path: PathBuf, name_prefix: String) -> Vec<User> {
    let contents = fs::read_to_string(&config_path).unwrap();
    let all_users: Vec<User> = toml::from_str(&contents).unwrap();

    let users_copy = all_users.clone(); // why?
    let prefix_copy = name_prefix.clone(); // why?

    let mut result: Vec<User> = Vec::new();
    for user in users_copy {
        if user.active && user.name.starts_with(&prefix_copy) {
            result.push(user);
        }
    }
    result
}

/// Returns a comma-separated list of active user emails.
///
/// Bugs:
///  - `users: Vec<User>` takes ownership unnecessarily.
///  - Another hand-rolled loop that could be an iterator chain.
///  - `String` concatenation via `+=` instead of building from an iterator.
pub fn active_emails(users: Vec<User>) -> String {
    let mut out = String::new();
    let mut first = true;
    for u in users {
        if u.active {
            if !first {
                out += ", ";
            }
            out += &u.email;
            first = false;
        }
    }
    out
}

/// Look up a user by id.
///
/// Bugs:
///  - `.unwrap()` on `.find(...)` (returns `Option`) — panics when the id is missing.
///  - Takes `users: Vec<User>` by value.
pub fn find_user(users: Vec<User>, id: u64) -> User {
    users.into_iter().find(|u| u.id == id).unwrap()
}

fn main() {
    let path = PathBuf::from("users.toml");
    let prefix = String::from("A");
    let active = load_active_users(path, prefix);
    let emails = active_emails(active.clone());
    let alice = find_user(active, 1);
    println!("alice: {:?}", alice);
    println!("emails: {}", emails);
}
