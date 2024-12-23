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

        // Listen for contract events and update the timeline
        listenForEvents();
    } catch (error) {
        console.error("Error initializing contract:", error.message);
        alert(error.message);
    }
}

// Function to listen for contract events
function listenForEvents() {
    const timeline = document.getElementById("timeline");

    // Replace "EventName" with the actual event names emitted by your contract
    sandboxContract.on("BonusPaid", (producer, amount, reason, event) => {
        addToTimeline(`Bonus Paid: ${amount / 1e18} tokens (${reason}) to ${producer}`, event);
    });

    sandboxContract.on("RecruitmentIncentivePaid", (producer, amount, event) => {
        addToTimeline(`Recruitment Incentive Paid: ${amount / 1e18} tokens to ${producer}`, event);
    });

    sandboxContract.on("ClassCompletionRewardPaid", (producer, amount, event) => {
        addToTimeline(`Class Completion Reward Paid: ${amount / 1e18} tokens to ${producer}`, event);
    });

    sandboxContract.on("EngagementBonusPaid", (producer, amount, event) => {
        addToTimeline(`Engagement Bonus Paid: ${amount / 1e18} tokens to ${producer}`, event);
    });

    sandboxContract.on("FinalCompletionPaid", (producer, amount, event) => {
        addToTimeline(`Final Completion Paid: ${amount / 1e18} tokens to ${producer}`, event);
    });
}

// Function to add an event to the timeline
function addToTimeline(message, event) {
    const timeline = document.getElementById("timeline");
    const newEvent = document.createElement("p");

    const eventLink = `<a href="https://polygonscan.com/tx/${event.transactionHash}" target="_blank">View on PolygonScan</a>`;
    newEvent.innerHTML = `${message} <br> ${eventLink}`;

    timeline.appendChild(newEvent);

    // Scroll to the bottom of the timeline
    timeline.scrollTop = timeline.scrollHeight;
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