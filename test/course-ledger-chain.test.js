"use strict";

const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { assessExistingSandboxAbi, checkReadOnlyPreflight } = require("../public/scripts/course-ledger-chain.js");

const root = path.join(__dirname, "..");
const abi = JSON.parse(readFileSync(path.join(root, "public/assets/sandboxProducerABI.json"), "utf8"));
const source = readFileSync(path.join(root, "contracts/SandboxProducer.sol"), "utf8");
const deployment = { chainId: 137, address: "0x1111111111111111111111111111111111111111" };
const owner = "0x2222222222222222222222222222222222222222";
const producer = "0x3333333333333333333333333333333333333333";

function mockedProvider({ chainId = "0x89", accounts = [owner], code = "0x60006000", failMethod } = {}) {
  const calls = [];
  return {
    calls,
    async request(request) {
      calls.push(request.method);
      if (request.method === failMethod) throw new Error("synthetic RPC failure");
      if (request.method === "eth_chainId") return chainId;
      if (request.method === "eth_requestAccounts") return accounts;
      if (request.method === "eth_getCode") return code;
      if (request.method === "eth_sendTransaction") throw new Error("transaction submission is prohibited in this test");
      throw new Error(`unexpected RPC method: ${request.method}`);
    },
  };
}

function readRoles({ contractOwner = owner, contractProducer = producer, fail = false } = {}) {
  return async (_address, method) => {
    if (fail) throw new Error("synthetic contract read failure");
    if (method === "owner") return contractOwner;
    if (method === "producer") return contractProducer;
    throw new Error(`unexpected contract method: ${method}`);
  };
}

test("the actual Sandbox ABI is payout accounting, not course evidence", () => {
  const assessment = assessExistingSandboxAbi(abi);
  const classCall = abi.find((entry) => entry.type === "function" && entry.name === "recordClassCompletion");

  assert.equal(assessment.hasOwnerGetter, true);
  assert.equal(assessment.hasProducerGetter, true);
  assert.equal(assessment.hasClassCompletionPayout, true);
  assert.equal(assessment.hasCourseScopedEvent, false);
  assert.equal(assessment.compatibleCourseEvidence, false);
  assert.deepEqual(classCall.inputs.map((input) => input.name), ["attendees"]);
  assert.equal(classCall.stateMutability, "nonpayable");
  assert.match(source, /attendees\s*>=\s*10/);
  assert.match(source, /token\.transfer\(producer,\s*payout\)/);
  assert.match(source, /classesCompleted\+\+/);
  assert.match(source, /CLASS_COMPLETION_REWARD\s*=\s*2\s*\*\s*10\*\*18/);
});

test("opted-out path makes no provider or contract calls", async () => {
  const provider = mockedProvider();
  const readContract = readRoles();
  const result = await checkReadOnlyPreflight({
    optedIn: false, deployment, provider, abi, role: "facilitator", readContract,
  });

  assert.equal(result.state, "opted-out");
  assert.deepEqual(provider.calls, []);
  assert.equal(result.submitted, false);
  assert.equal(result.confirmed, false);
  assert.equal(result.receipt, null);
});

test("missing deployment configuration is unavailable and does not request a wallet", async () => {
  const provider = mockedProvider();
  const result = await checkReadOnlyPreflight({
    optedIn: true, deployment: null, provider, abi, role: "facilitator", readContract: readRoles(),
  });

  assert.equal(result.state, "unavailable");
  assert.deepEqual(provider.calls, []);
});

test("invalid address and mismatched chain are blocked before wallet access", async () => {
  const provider = mockedProvider({ chainId: "0x1" });
  const invalidAddress = await checkReadOnlyPreflight({
    optedIn: true,
    deployment: { ...deployment, address: "not-an-address" },
    provider, abi, role: "facilitator", readContract: readRoles(),
  });
  assert.equal(invalidAddress.state, "unavailable");
  assert.deepEqual(provider.calls, []);

  const wrongChain = await checkReadOnlyPreflight({
    optedIn: true, deployment, provider, abi, role: "facilitator", readContract: readRoles(),
  });
  assert.equal(wrongChain.state, "blocked");
  assert.match(wrongChain.message, /does not match expected chain/);
  assert.deepEqual(provider.calls, ["eth_chainId"]);
});

test("learner role is blocked and missing contract code cannot pass preflight", async () => {
  const learnerProvider = mockedProvider();
  const learner = await checkReadOnlyPreflight({
    optedIn: true, deployment, provider: learnerProvider, abi, role: "learner", readContract: readRoles(),
  });
  assert.equal(learner.state, "blocked");
  assert.match(learner.message, /no learner evidence role/);
  assert.deepEqual(learnerProvider.calls, ["eth_chainId"]);

  const noCodeProvider = mockedProvider({ code: "0x" });
  const noCode = await checkReadOnlyPreflight({
    optedIn: true, deployment, provider: noCodeProvider, abi, role: "facilitator", readContract: readRoles(),
  });
  assert.equal(noCode.state, "blocked");
  assert.match(noCode.message, /no contract bytecode/);
  assert.deepEqual(noCodeProvider.calls, ["eth_chainId", "eth_requestAccounts", "eth_getCode"]);
});

test("only configured contract owner passes facilitator role check, but still cannot submit", async () => {
  const provider = mockedProvider({ accounts: [producer] });
  const wrongRole = await checkReadOnlyPreflight({
    optedIn: true, deployment, provider, abi, role: "facilitator", readContract: readRoles(),
  });
  assert.equal(wrongRole.state, "blocked");
  assert.match(wrongRole.message, /not the contract owner/);
  assert.equal(wrongRole.submitted, false);
  assert.equal(wrongRole.confirmed, false);
  assert.equal(wrongRole.receipt, null);

  const validReadOnlyProvider = mockedProvider();
  const noCourseMethod = await checkReadOnlyPreflight({
    optedIn: true, deployment, provider: validReadOnlyProvider, abi, role: "facilitator", readContract: readRoles(),
  });
  assert.equal(noCourseMethod.state, "unavailable");
  assert.match(noCourseMethod.message, /no course-scoped event/);
  assert.deepEqual(noCourseMethod.checked, {
    chainId: 137,
    address: deployment.address,
    actor: owner,
    role: "facilitator/owner",
  });
  assert.equal(noCourseMethod.submitted, false);
  assert.equal(noCourseMethod.confirmed, false);
  assert.equal(noCourseMethod.receipt, null);
  assert.ok(!validReadOnlyProvider.calls.includes("eth_sendTransaction"));
});

test("provider and ABI read failures remain errors, never success or receipt", async () => {
  const provider = mockedProvider({ failMethod: "eth_getCode" });
  const result = await checkReadOnlyPreflight({
    optedIn: true, deployment, provider, abi, role: "facilitator", readContract: readRoles(),
  });

  assert.equal(result.state, "error");
  assert.match(result.message, /synthetic RPC failure/);
  assert.equal(result.submitted, false);
  assert.equal(result.confirmed, false);
  assert.equal(result.receipt, null);

  const readFailure = await checkReadOnlyPreflight({
    optedIn: true, deployment, provider: mockedProvider(), abi, role: "facilitator", readContract: readRoles({ fail: true }),
  });
  assert.equal(readFailure.state, "error");
  assert.equal(readFailure.submitted, false);
  assert.equal(readFailure.confirmed, false);
  assert.equal(readFailure.receipt, null);
});
