"use strict";

(() => {
  const MAX_WEEKS = 12;
  const MAX_LEARNERS = 6;
  const entries = [];
  const roleSelect = document.getElementById("role-select");
  const learnerForm = document.getElementById("learner-form");
  const facilitatorForm = document.getElementById("facilitator-form");
  const learnerWeek = document.getElementById("learner-week");
  const sessionWeek = document.getElementById("session-week");
  const attendeeCount = document.getElementById("attendee-count");
  const timeline = document.getElementById("timeline");
  const actionStatus = document.getElementById("action-status");
  const chainCheckStatus = document.getElementById("chain-check-status");
  const chainCheckResult = document.getElementById("chain-check-result");

  function populateWeeks(select) {
    for (let week = 1; week <= MAX_WEEKS; week += 1) {
      const option = document.createElement("option");
      option.value = String(week);
      option.textContent = `Week ${week}`;
      select.appendChild(option);
    }
  }

  function setRole(role) {
    learnerForm.hidden = role !== "learner";
    facilitatorForm.hidden = role !== "facilitator";
    actionStatus.textContent = role === "learner"
      ? "Learner mode: checkpoints remain in this tab only."
      : "Facilitator mode: use synthetic aggregate counts only.";
  }

  function appendEntry(entry) {
    entries.push(entry);
    renderTimeline();
    actionStatus.textContent = `${entry.label} added locally. Nothing was sent or saved.`;
  }

  function hasWeek(role, week) {
    return entries.some((entry) => entry.role === role && entry.week === week);
  }

  function renderTimeline() {
    timeline.replaceChildren();
    if (entries.length === 0) {
      const empty = document.createElement("li");
      empty.className = "empty-state";
      empty.textContent = "No local records. Add a checkpoint or simulated session to begin.";
      timeline.appendChild(empty);
      return;
    }

    for (const entry of entries) {
      const item = document.createElement("li");
      item.className = "timeline-event";
      const card = document.createElement("div");
      card.className = "event-content";
      const heading = document.createElement("h3");
      heading.textContent = entry.label;
      const details = document.createElement("p");
      details.textContent = entry.details;
      const tag = document.createElement("p");
      tag.className = "local-tag";
      tag.textContent = "SIMULATED · LOCAL ONLY";
      card.append(heading, details, tag);
      item.appendChild(card);
      timeline.appendChild(item);
    }
  }

  populateWeeks(learnerWeek);
  populateWeeks(sessionWeek);
  setRole(roleSelect.value);

  roleSelect.addEventListener("change", () => setRole(roleSelect.value));

  learnerForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const week = Number(learnerWeek.value);
    const checkpoint = document.getElementById("checkpoint-kind").value;
    if (!Number.isInteger(week) || week < 1 || week > MAX_WEEKS) {
      actionStatus.textContent = "Choose a week from 1 to 12.";
      return;
    }
    if (hasWeek("Learner", week)) {
      actionStatus.textContent = `A local learner checkpoint already exists for week ${week}.`;
      return;
    }
    appendEntry({
      role: "Learner",
      week,
      label: `LearnerCheckpoint · week ${week}`,
      details: checkpoint,
    });
  });

  facilitatorForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const week = Number(sessionWeek.value);
    const attendees = Number(attendeeCount.value);
    if (!Number.isInteger(week) || week < 1 || week > MAX_WEEKS) {
      actionStatus.textContent = "Choose a week from 1 to 12.";
      return;
    }
    if (!Number.isInteger(attendees) || attendees < 0 || attendees > MAX_LEARNERS) {
      actionStatus.textContent = "Attendance must be a whole synthetic count from 0 to 6.";
      return;
    }
    if (hasWeek("Facilitator", week)) {
      actionStatus.textContent = `A local facilitator session already exists for week ${week}.`;
      return;
    }
    appendEntry({
      role: "Facilitator",
      week,
      label: `ClassSessionRecorded · week ${week}`,
      details: `${attendees} synthetic attendees. No names or individual records.`,
    });
  });

  document.getElementById("sample-button").addEventListener("click", () => {
    if (entries.length > 0) {
      actionStatus.textContent = "Clear local records before loading the synthetic sample.";
      return;
    }
    entries.push(
      {
        role: "Facilitator",
        week: 1,
        label: "ClassSessionRecorded · week 1",
        details: "3 synthetic attendees. No names or individual records.",
      },
      {
        role: "Learner",
        week: 1,
        label: "LearnerCheckpoint · week 1",
        details: "I can explain the user need.",
      },
    );
    renderTimeline();
    actionStatus.textContent = "Synthetic sample loaded in this tab only. Nothing was sent or saved.";
  });

  document.getElementById("reset-button").addEventListener("click", () => {
    entries.length = 0;
    renderTimeline();
    actionStatus.textContent = "Local records cleared from this page.";
  });

  document.getElementById("chain-check-button").addEventListener("click", async () => {
    const optIn = document.getElementById("chain-opt-in").checked;
    const configuredChainId = document.getElementById("chain-id").value.trim();
    const configuredAddress = document.getElementById("chain-address").value.trim();
    const configured = configuredChainId && configuredAddress
      ? { chainId: configuredChainId, address: configuredAddress }
      : null;

    chainCheckStatus.textContent = "Checking configuration. No transaction will be sent.";
    chainCheckResult.textContent = "Submitted: no · Confirmed: no";
    let abi = [];
    if (configured) {
      try {
        const response = await fetch("./assets/sandboxProducerABI.json");
        if (!response.ok) throw new Error("Sandbox Producer ABI is unavailable.");
        abi = await response.json();
      } catch (error) {
        chainCheckStatus.textContent = `Read-only check failed: ${error.message}. No submission or confirmation occurred.`;
        return;
      }
    }

    const readContract = async (address, method) => {
      if (!window.ethers) {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://cdnjs.cloudflare.com/ajax/libs/ethers/5.7.2/ethers.umd.min.js";
          script.onload = resolve;
          script.onerror = () => reject(new Error("Read-only contract helper could not be loaded."));
          document.head.appendChild(script);
        });
      }
      const provider = new window.ethers.providers.Web3Provider(window.DecentHead.getWallet().rawProvider);
      const contract = new window.ethers.Contract(address, abi, provider);
      if (method !== "owner" && method !== "producer") throw new Error("Unsupported read-only role check.");
      return contract[method]();
    };

    const session = window.DecentHead?.getWallet();
    const rawProvider = session?.rawProvider;
    const sharedProvider = rawProvider && {
      request: ({ method, ...rest }) => method === "eth_requestAccounts"
        ? Promise.resolve(session.snapshot().connected ? [session.snapshot().address] : [])
        : rawProvider.request({ method, ...rest })
    };
    const preflight = await window.CourseLedgerChain.checkReadOnlyPreflight({
      optedIn: optIn,
      deployment: configured,
      provider: sharedProvider,
      abi,
      role: document.getElementById("chain-role").value,
      readContract,
    });
    chainCheckStatus.textContent = preflight.message;
    if (preflight.checked) {
      chainCheckStatus.textContent += ` Checked: chain ${preflight.checked.chainId}; contract ${preflight.checked.address}; ${preflight.checked.role}.`;
    }
    chainCheckResult.textContent = `Submitted: ${preflight.submitted ? "yes" : "no"} · Confirmed: ${preflight.confirmed ? "yes" : "no"} · Receipt: ${preflight.receipt ? "available" : "none"}`;
  });
})();
