# JollySandbox

![JollySandbox Landing](./public/assets/landing.png)

### A Place for Growth and Play ✨

### DecentHead integration

The Producer entry `public/index.html` and synthetic rehearsal
`public/course-ledger.html` reuse DecentHead
`00691c4fe93fd280f5aec780bdc4fac651bfcdb1`'s manifest, `WalletSession`,
`IPFSControls` and `AboutModal` with LICENSE/NOTICE. `switchChain` and
`WalletConnect` accept `chain: null` to observe rather than switch chains.
The Producer button and course preflight use this same wallet session; the
Producer portal retains its existing Polygon address/ABI and requires Polygon.
Account, chain or disconnect events invalidate initialized Producer controls;
explicit reinitialization is required. The opt-in course check only reads and
still cannot submit course evidence.

The local ethers v6 wrapper uses the donor UMD bytes in a module-scoped
CommonJS envelope so the existing v5 portal remains separate. Header IPFS
provider selection is unverified, generic uploads/pins are disabled, and
backup, replication and rewards are unavailable; UCAN is not implemented.
No learner data is uploaded. No live contract or storage verification is
implied.

Receiving tests: `node --test test/course-ledger-chain.test.js`; browser test
`test/header-browser.cjs` uses Playwright and a local HTTP server on port
allocated ephemerally by the test itself. It covers both entries at 375px with synthetic wallets, rejection,
account/network changes, disconnect, local provider selection, unavailable
storage, About and the read-only shared-session preflight. It blocks external
requests and makes no transactions.

Explicit provider verification reuses the shared
`IPFSSession.verifyConnection()` flow and probe UI from canonical DecentHead
`00691c4`.
Personal Pinata credentials remain in tab memory and go only to the fixed
HTTPS authentication endpoint. Local Kubo's loopback version probe receives
no credentials. `IPFSStatus` requires verified connectivity for ready; backup,
retention and rewards remain unavailable and distinct from provider readiness.
Run `node test/provider-connect.browser.cjs` for self-contained mocked
Pinata401/network/ready and Kubo responses on both entries with no uploads.

**JollySandbox** is an interactive platform built to demonstrate a dynamic **ERC-20 token payout contract** on the Polygon blockchain. This project provides a transparent and automated reward system for producers, encouraging engagement and successful project execution.

---

## 🌟 Features

- **Signing Bonus**: Automatic reward upon contract signing.
- **Recruitment Incentive**: Bonus payouts for successful student recruitment.
- **Class Completion Reward**: Tokens awarded for successfully conducted sessions.
- **Engagement Bonus**: Rewards for students attending the majority of sessions.
- **Final Completion Payment**: Lump sum reward for fulfilling all contract terms.

### Key Event Logging
Real-time event tracking is implemented on the front-end, providing a clear timeline of contract activities.

---

## 🔗 Links

### Contract on PolygonScan
[View the contract on PolygonScan](https://polygonscan.com/address/0xfd5011a9080b6059411236ab74f395b74e597573)

### Live Deployment on GitHub Pages
[Visit the JollySandbox Application](https://TheJollyLaMa.github.io/JollySandbox/public)

---

## ⚙️ How to Use

1. **Connect Your Wallet**: Use MetaMask to interact with the application.
2. **Claim Rewards**: Producers can claim their bonuses and record achievements directly from the UI.
3. **Monitor Timeline**: View a scrolling timeline of contract events to track progress.

---

## No-wallet course exercise

`public/course-ledger.html` is a separate, synthetic facilitator/learner exercise
prepared for the Decent Code Camp. It is not the wallet-connected portal above:
its local activity rehearsal is in-memory and sends no learner data. A separate
wallet/chain compatibility check is opt-in and read-only; it never submits a
transaction. The existing producer contract has no safe course-evidence method:
`recordClassCompletion(attendees)` requires 10 or more attendees and transfers
tokens to the producer, while the course pilot is capped at six. It must not be
used as course evidence. The exercise reports public-ledger submission as
unavailable, not successful. The learner and facilitator guide is in the
[AJollyDecentCodeCamp repository](https://github.com/TheJollyLaMa/AJollyDecentCodeCamp/blob/main/course/12-week-dapp-course.md).

Run the exercise locally from this checkout:

```sh
python3 -m http.server 4315 --directory public
```

Open `http://127.0.0.1:4315/course-ledger.html`. No wallet or installed
dependencies are required.

Run the Sandbox contract-compatibility unit tests with
`node --test test/course-ledger-chain.test.js`. A responsive browser check
requires Playwright and the local preview server:

```sh
PLAYWRIGHT_MODULE=/path/to/node_modules/playwright/index.mjs node test/course-ledger.browser.mjs
```

It exercises the 375px view, opt-out and missing-configuration zero-RPC
behavior, no external requests, and in-memory-only rehearsal records.

---

## 🛠️ Tech Stack

- **Smart Contract**: Written in Solidity and deployed on Polygon.
- **Front-End**: HTML, CSS, JavaScript, and ethers.js for Web3 integration.
- **Back-End**: Node.js to serve static files.
- **Hosting**: Deployed on GitHub Pages.

## License

Code: [Apache-2.0](LICENSE) · Art and docs: [CC BY 4.0](LICENSES/CC-BY-4.0.txt) · Please keep the [NOTICE](NOTICE) and give The Jolly LaMa / A Decent Agency a head nod when you reuse this work.
Support the work with a [Supporter DNFT](https://thejollylama.github.io/DecentMarket/).
