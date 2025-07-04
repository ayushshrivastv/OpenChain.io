# Solana Dependency Issue

I am having a very persistent dependency issue with the Solana program in this project. I have been trying to build the contract, but I am constantly getting the following error message:

```
error: failed to select a version for `solana-program`.
    ... required by package `solana-zk-sdk v2.1.0`
    ... which satisfies dependency `solana-zk-sdk = "^2.1.0"` of package `spl-token-2022 v6.0.0`
    ... which satisfies dependency `spl-token-2022 = "^6"` of package `anchor-spl v0.31.1`
    ... which satisfies dependency `anchor-spl = "^0.31.1"` of package `lending_pool v0.1.0 (/Users/ayushsrivastava/OpenChain/contracts/solana/programs/lending_pool)`
versions that meet the requirements `=2.1.0` are: 2.1.0

all possible versions conflict with previously selected packages.

  previously selected package `solana-program v2.3.0`
    ... which satisfies dependency `solana-program = "^2.1.0"` of package `spl-associated-token-account v6.0.0`
    ... which satisfies dependency `spl-associated-token-account = "^6"` of package `anchor-spl v0.31.1`
    ... which satisfies dependency `anchor-spl = "^0.31.1"` of package `lending_pool v0.1.0 (/Users/ayushsrivastava/OpenChain/contracts/solana/programs/lending_pool)`

failed to select a version for `solana-program` which could resolve this conflict
```

I have tried the following steps to resolve this issue:

1.  Removed the `solana-program` dependency from the program's `Cargo.toml` file.
2.  Removed the `solana-program` dependency from the root `Cargo.toml` file.
3.  Pinned the `solana-program` dependency to version `2.1.0` in the root `Cargo.toml` file.
4.  Deleted the `Cargo.lock` file and the `target` directory.
5.  Cleared the `cargo` cache by deleting the `~/.cargo` directory.
6.  Reinstalled `rust` and `cargo` using `rustup`.
7.  Reinstalled `anchor-cli`.

None of these steps have resolved the issue. I am out of ideas for how to solve this. If you have any ideas, please let me know. 
