const { ethers } = window;

let sandboxContract;
let walletProvider;
let userAddress;

// Load the ABI
const loadABI = async () => {
    const response = await fetch("./assets/sandboxProducerABI.json");
    if (!response.ok) throw new Error("Failed to load contract ABI.");
    return response.json();
};

// Initialize wallet connection
async function connectWallet() {
    if (typeof window.ethereum === "undefined") {
        alert("MetaMask is not installed! Please install MetaMask to use this application.");
        return;
    }

    try {
        // Check if MetaMask is available
        walletProvider = new ethers.providers.Web3Provider(window.ethereum);

        // Request wallet connection
        const accounts = await walletProvider.send("eth_requestAccounts", []);
        userAddress = accounts[0];

    } catch (error) {
        console.error("Error connecting wallet:", error.message);
        alert(error.message);
    }
}

async function initializeContract(contractAddress) {
    try {
        if (!walletProvider) {
            throw new Error("Wallet is not connected. Please connect your wallet first.");
        }

        const abi = await loadABI();
        const signer = walletProvider.getSigner();
        sandboxContract = new ethers.Contract(contractAddress, abi, signer);

        console.log("Sandbox Producer Contract Initialized:", sandboxContract.address);
        const polygonIcons = Array(4)
            .fill('<img src="./assets/Polygon_Logo.png" class="icon-small" alt="icon">')
            .join("");

        // Display the contract address as a clickable button
        const contractButton = document.getElementById("contract-link");
        contractButton.innerHTML = `${contractAddress.slice(0, 6)}...${polygonIcons}...${contractAddress.slice(-4)}`;
        
        contractButton.onclick = () => window.open(`https://polygonscan.com/address/${contractAddress}`, "_blank");
        
        // Remove hidden class to show the button
        const contractDisplay = document.getElementById("contract-address");
        contractDisplay.classList.remove("hidden");


        // Generate favicons for the address display
        const favicons = Array(4)
            .fill('<img src="./assets/Ens_Eth_Breathe.gif" class="icon-small" alt="icon">')
            .join("");

        // get contract owner address
        const ownerAddress = await sandboxContract.owner();

        // Display the connected wallet address
        const directorAddress = document.getElementById("director-address");
        directorAddress.innerHTML = `Director: ${ownerAddress.slice(0, 4)}...${favicons}...${ownerAddress.slice(-4)}`;
        directorAddress.classList.remove("hidden");

        // Fetch and display the producer's address
        const producerAddress = await sandboxContract.producer();

        const producerDisplay = document.getElementById("producer-address");
        producerDisplay.innerHTML = `Producer: ${producerAddress.slice(0, 4)}...${favicons}...${producerAddress.slice(-4)}`;
        producerDisplay.classList.remove("hidden");

        // Fetch past events
        fetchPastEvents();
        // Listen for contract events and update the timeline
        listenForEvents();
    } catch (error) {
        console.error("Error initializing contract:", error.message);
        alert(error.message);
    }
}

// Fetch past events
async function fetchPastEvents() {
    try {
        console.log("Fetching past events...");

        // Get all BonusPaid events
        const bonusPaidEvents = await sandboxContract.queryFilter("BonusPaid");
        bonusPaidEvents.forEach((event) => {
            const { producer, amount, reason } = event.args;
            console.log("Past BonusPaid event detected:", { producer, amount, reason });
            addToTimeline(`Bonus Paid: ${amount / 1e18} tokens (${reason}) to ${producer}`, event);
        });

        // Get all RecruitmentIncentivePaid events
        const recruitmentEvents = await sandboxContract.queryFilter("RecruitmentIncentivePaid");
        recruitmentEvents.forEach((event) => {
            const { producer, amount } = event.args;
            console.log("Past RecruitmentIncentivePaid event detected:", { producer, amount });
            addToTimeline(`Recruitment Incentive Paid: ${amount / 1e18} tokens to ${producer}`, event);
        });

        // Get all ClassCompletionRewardPaid events
        const classCompletionEvents = await sandboxContract.queryFilter("ClassCompletionRewardPaid");
        classCompletionEvents.forEach((event) => {
            const { producer, amount } = event.args;
            console.log("Past ClassCompletionRewardPaid event detected:", { producer, amount });
            addToTimeline(`Class Completion Reward Paid: ${amount / 1e18} tokens to ${producer}`, event);
        });

        // Get all EngagementBonusPaid events
        const engagementEvents = await sandboxContract.queryFilter("EngagementBonusPaid");
        engagementEvents.forEach((event) => {
            const { producer, amount } = event.args;
            console.log("Past EngagementBonusPaid event detected:", { producer, amount });
            addToTimeline(`Engagement Bonus Paid: ${amount / 1e18} tokens to ${producer}`, event);
        });

        // Get all FinalCompletionPaid events
        const finalCompletionEvents = await sandboxContract.queryFilter("FinalCompletionPaid");
        finalCompletionEvents.forEach((event) => {
            const { producer, amount } = event.args;
            console.log("Past FinalCompletionPaid event detected:", { producer, amount });
            addToTimeline(`Final Completion Paid: ${amount / 1e18} tokens to ${producer}`, event);
        });
    } catch (error) {
        console.error("Error fetching past events:", error.message);
        alert("Failed to fetch past events.");
    }
}


// Function to listen for contract events
function listenForEvents() {
    sandboxContract.on("BonusPaid", (producer, amount, reason, event) => {
        console.log("BonusPaid event detected:", { producer, amount, reason });
        addToTimeline(`Bonus Paid: ${amount / 1e18} tokens (${reason}) to ${producer}`, event);
    });

    sandboxContract.on("RecruitmentIncentivePaid", (producer, amount, event) => {
        console.log("RecruitmentIncentivePaid event detected:", { producer, amount });
        addToTimeline(`Recruitment Incentive Paid: ${amount / 1e18} tokens to ${producer}`, event);
    });

    sandboxContract.on("ClassCompletionRewardPaid", (producer, amount, event) => {
        console.log("ClassCompletionRewardPaid event detected:", { producer, amount });
        addToTimeline(`Class Completion Reward Paid: ${amount / 1e18} tokens to ${producer}`, event);
    });

    sandboxContract.on("EngagementBonusPaid", (producer, amount, event) => {
        console.log("EngagementBonusPaid event detected:", { producer, amount });
        addToTimeline(`Engagement Bonus Paid: ${amount / 1e18} tokens to ${producer}`, event);
    });

    sandboxContract.on("FinalCompletionPaid", (producer, amount, event) => {
        console.log("FinalCompletionPaid event detected:", { producer, amount });
        addToTimeline(`Final Completion Paid: ${amount / 1e18} tokens to ${producer}`, event);
    });
}

// Function to add an event to the timeline
function addToTimeline(message, event) {
    const timeline = document.getElementById("timeline");

    // Create timeline event container
    const timelineEvent = document.createElement("div");
    timelineEvent.className = "timeline-event";

    // Add icons for stacked look
    const iconStack = document.createElement("div");
    iconStack.className = "icon-stack";
    for (let i = 0; i < 3; i++) {
        const icon = document.createElement("img");
        icon.src = "./assets/DecentSmartHome_Logo.png"; // Replace with your preferred icon
        icon.alt = "Icon";
        iconStack.appendChild(icon);
    }

    // Add event content
    const eventContent = document.createElement("div");
    eventContent.className = "event-content";

    // Create a table for the event data
    const table = document.createElement("table");

    const producerRow = `<tr>
        <th>Producer</th>
        <td class="address">${formatAddress(event.args.producer)}</td>
    </tr>`;
    const amountRow = `<tr>
        <th>Amount</th>
        <td class="token"><img src="./assets/DecentSmartHome_Logo.png" alt="SHT"> ${event.args.amount / 1e18}</td>
    </tr>`;
    const reasonRow = event.args.reason
        ? `<tr>
        <th>Reason</th>
        <td>${event.args.reason}</td>
    </tr>`
        : "";
    const linkRow = `<tr>
        <th>Transaction</th>
        <td><a href="https://polygonscan.com/tx/${event.transactionHash}" target="_blank">View on PolygonScan</a></td>
    </tr>`;

    // Combine all rows
    table.innerHTML = producerRow + amountRow + reasonRow + linkRow;

    // Append the table to the content
    eventContent.appendChild(table);

    // Combine elements
    timelineEvent.appendChild(iconStack);
    timelineEvent.appendChild(eventContent);
    timeline.appendChild(timelineEvent);

    // Scroll to the bottom of the timeline
    timeline.scrollTop = timeline.scrollHeight;
}

// Helper function to format addresses
function formatAddress(address) {
    const favicons = Array(4)
        .fill('<img src="./assets/Polygon_Logo.png" class="icon-small" alt="icon">')
        .join("");
    return `${address.slice(0, 6)}...${favicons}...${address.slice(-4)}`;
}

// Claim Signing Bonus
async function claimSigningBonus() {
    try {
        // Show the loader
        const loader = document.getElementById("loader");
        loader.classList.remove("hidden");

        // Initiate the transaction
        const tx = await sandboxContract.paySigningBonus();
        console.log("Transaction sent:", tx.hash);

        // Wait for transaction confirmation
        await tx.wait();

        // Transaction successful
        alert("Signing bonus claimed successfully!");
    } catch (error) {
        console.error("Error claiming signing bonus:", error);
        alert("Failed to claim signing bonus.");
    } finally {
        // Hide the loader
        const loader = document.getElementById("loader");
        loader.classList.add("hidden");
    }
}

// Record Recruitment
async function recordRecruitment(students) {
    try {
        // Show the loader
        const loader = document.getElementById("loader");
        loader.classList.remove("hidden");

        // Initiate the transaction
        const tx = await sandboxContract.recordStudentRecruitment(students);
        console.log("Transaction sent:", tx.hash);

        // Wait for transaction confirmation
        await tx.wait();

        // Transaction successful
        alert(`Recruitment of ${students} students recorded successfully!`);
    } catch (error) {
        console.error("Error recording recruitment:", error);
        alert("Failed to record recruitment.");
    } finally {
        // Hide the loader
        const loader = document.getElementById("loader");
        loader.classList.add("hidden");
    }
}

// Record Class Completion
async function recordClassCompletion(attendees) {
    try {
        // Show the loader
        const loader = document.getElementById("loader");
        loader.classList.remove("hidden");

        // Initiate the transaction
        const tx = await sandboxContract.recordClassCompletion(attendees);
        console.log("Transaction sent:", tx.hash);

        // Wait for transaction confirmation
        await tx.wait();

        // Transaction successful
        alert(`Class completion with ${attendees} attendees recorded successfully!`);
    } catch (error) {
        console.error("Error recording class completion:", error);
        alert("Failed to record class completion.");
    } finally {
        // Hide the loader
        const loader = document.getElementById("loader");
        loader.classList.add("hidden");
    }
}

// Claim Final Completion
async function claimFinalCompletion() {
    try {
        // Show the loader
        const loader = document.getElementById("loader");
        loader.classList.remove("hidden");

        // Initiate the transaction
        const tx = await sandboxContract.payFinalCompletion();
        console.log("Transaction sent:", tx.hash);

        // Wait for transaction confirmation
        await tx.wait();

        // Transaction successful
        alert("Final completion payment claimed successfully!");
    } catch (error) {
        console.error("Error claiming final completion payment:", error);
        alert("Failed to claim final completion payment.");
    } finally {
        // Hide the loader
        const loader = document.getElementById("loader");
        loader.classList.add("hidden");
    }
}