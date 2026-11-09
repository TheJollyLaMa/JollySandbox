"use strict";

(() => {
  const NO_SUBMISSION = { submitted: false, confirmed: false, receipt: null };
  const ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/;

  function result(state, message, extra = {}) {
    return { state, message, ...NO_SUBMISSION, ...extra };
  }

  function hasFunction(abi, name, inputTypes, mutability) {
    return abi.some((entry) => entry.type === "function"
      && entry.name === name
      && entry.stateMutability === mutability
      && JSON.stringify((entry.inputs || []).map((input) => input.type)) === JSON.stringify(inputTypes));
  }

  function assessExistingSandboxAbi(abi) {
    const classCompletion = abi.find((entry) => entry.type === "function" && entry.name === "recordClassCompletion");
    const payoutEvent = abi.some((entry) => entry.type === "event" && entry.name === "ClassCompletionRewardPaid");
    const hasCourseScopedEvent = abi.some((entry) => entry.type === "event"
      && (entry.inputs || []).some((input) => /course|week|evidence/i.test(input.name || "")));
    return {
      hasOwnerGetter: hasFunction(abi, "owner", [], "view"),
      hasProducerGetter: hasFunction(abi, "producer", [], "view"),
      hasClassCompletionPayout: Boolean(classCompletion)
        && classCompletion.stateMutability === "nonpayable"
        && JSON.stringify((classCompletion.inputs || []).map((input) => input.type)) === JSON.stringify(["uint256"])
        && payoutEvent,
      hasCourseScopedEvent,
      compatibleCourseEvidence: false,
      reason: "The Sandbox ABI has no course-scoped event or reviewed no-payout evidence write. Its class-completion method is a payout, not course evidence.",
    };
  }

  async function checkReadOnlyPreflight({ optedIn, deployment, provider, abi, role, readContract }) {
    if (!optedIn) return result("opted-out", "Opted out. No wallet, RPC, or submission was requested.");
    if (!deployment || !Number.isSafeInteger(Number(deployment.chainId)) || Number(deployment.chainId) <= 0
      || !ADDRESS_PATTERN.test(deployment.address || "")) {
      return result("unavailable", "Unavailable: provide a valid expected chain ID and contract address. No wallet request was made.");
    }
    if (!provider || typeof provider.request !== "function") {
      return result("unavailable", "Unavailable: no injected wallet provider is available. No submission occurred.");
    }

    try {
      const expectedChainId = Number(deployment.chainId);
      const chainHex = await provider.request({ method: "eth_chainId" });
      const actualChainId = Number.parseInt(chainHex, 16);
      if (actualChainId !== expectedChainId) {
        return result("blocked", `Blocked: connected chain ${actualChainId} does not match expected chain ${expectedChainId}.`);
      }

      const compatibility = assessExistingSandboxAbi(abi);
      if (!compatibility.hasOwnerGetter || !compatibility.hasProducerGetter) {
        return result("blocked", "Blocked: this is not the expected Sandbox Producer ABI.");
      }
      if (role !== "facilitator") {
        return result("blocked", "Blocked: the existing payout contract has no learner evidence role.");
      }
      if (!compatibility.hasClassCompletionPayout) {
        return result("blocked", "Blocked: the ABI differs from the inspected Sandbox Producer framework.");
      }

      const accounts = await provider.request({ method: "eth_requestAccounts" });
      const account = Array.isArray(accounts) ? accounts[0] : null;
      if (!account || !ADDRESS_PATTERN.test(account)) {
        return result("blocked", "Blocked: connect an account to check the facilitator role.");
      }

      const code = await provider.request({
        method: "eth_getCode",
        params: [deployment.address, "latest"],
      });
      if (typeof code !== "string" || !/^0x[0-9a-fA-F]*$/.test(code) || code === "0x" || /^0x0*$/.test(code)) {
        return result("blocked", "Blocked: no contract bytecode was found at the configured address.");
      }

      const [owner, producer] = await Promise.all([
        readContract(deployment.address, "owner"),
        readContract(deployment.address, "producer"),
      ]);
      if (!ADDRESS_PATTERN.test(owner || "") || !ADDRESS_PATTERN.test(producer || "")) {
        return result("blocked", "Blocked: the configured address did not return valid Sandbox owner/producer roles.");
      }
      if (owner.toLowerCase() !== account.toLowerCase()) {
        return result("blocked", "Blocked: connected account is not the contract owner. Only the owner can call the existing class payout.");
      }

      return result("unavailable", `${compatibility.reason} Read-only checks matched chain, bytecode, and facilitator/owner, but course evidence cannot be submitted. No transaction or receipt exists.`, {
        checked: { chainId: actualChainId, address: deployment.address, actor: account, role: "facilitator/owner" },
      });
    } catch (error) {
      return result("error", `Read-only check failed: ${error && error.message ? error.message : "provider error"}. No submission or confirmation occurred.`);
    }
  }

  const api = { assessExistingSandboxAbi, checkReadOnlyPreflight };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (typeof window !== "undefined") window.CourseLedgerChain = api;
})();
