use base64::{engine::general_purpose::STANDARD, Engine};
use minisign_verify::{PublicKey, Signature};
use std::{env, fs};
fn main() {
    if let Err(e) = run() {
        eprintln!("Update signature validation failed: {e}");
        std::process::exit(1);
    }
}
fn run() -> Result<(), Box<dyn std::error::Error>> {
    let a: Vec<String> = env::args().skip(1).collect();
    if a.len() != 4 {
        return Err(
            "Usage: verifier PUBLIC_KEY_FILE ARTIFACT SIGNATURE_FILE EXPECTED_VERSION".into(),
        );
    }
    let key = String::from_utf8(STANDARD.decode(fs::read_to_string(&a[0])?.trim())?)?;
    let signature = String::from_utf8(STANDARD.decode(fs::read_to_string(&a[2])?.trim())?)?;
    let signature = Signature::decode(&signature)?;
    PublicKey::decode(&key)?.verify(&fs::read(&a[1])?, &signature, true)?;
    let version = signature
        .trusted_comment()
        .split('\t')
        .find_map(|f| f.strip_prefix("version:"))
        .ok_or("Signature does not bind the application version")?;
    if version.trim_start_matches('v') != a[3].trim_start_matches('v') {
        return Err("Signed version differs from announced version".into());
    }
    println!("Cryptographic update signature verified for {}", a[3]);
    Ok(())
}
