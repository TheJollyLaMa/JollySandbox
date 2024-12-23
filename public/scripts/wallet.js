
export const connectWallet = async () => {
    const connectWalletButton = document.getElementById("connect-wallet");
    const enterControlsButton = document.getElementById("enter-controls");
    const walletDisplay = document.getElementById("wallet-display");
    const contractDisplay = document.getElementById("contract-display");
    const contractLink = document.getElementById("contract-link");
    if (!window.ethereum || !window.ethereum.isMetaMask) {
        alert("MetaMask is not detected! Please install MetaMask.");
        return;
    }
    if (window.ethereum) {
        try {
            console.log("MetaMask detected, initializing provider...");
            const provider = new ethers.providers.Web3Provider(window.ethereum);
            // console.log("Provider initialized:", provider);
            window.provider = provider; // Store provider globally
            // console.log("Requesting accounts...");
            await provider.send("eth_requestAccounts", []);
            // console.log("Accounts successfully requested.");
        
            const signer = provider.getSigner();
            // console.log("Signer initialized:", signer);
        
            const walletAddress = await signer.getAddress();
            // console.log("Wallet connected successfully:", walletAddress);

            // Update wallet display
            const favicons = Array(4)
                .fill('<img src="./assets/Ens_Eth_Breathe.gif" alt="icon">')
                .join("");
            walletDisplay.innerHTML = `${walletAddress.slice(0, 4)}...${favicons}...${walletAddress.slice(-4)}`;
            walletDisplay.classList.remove("hidden");

            const network = await provider.getNetwork();
            // console.log("Connected to network:", network);
            const chainId = network.chainId;
            window.chainId = chainId; // Store chain ID globally 
            let contractAddress;
            let abiPath;

            if (chainId === 24734) { // MintMe chain ID
                console.log("Detected Mintme network - Loading MintMe contract...");
                contractAddress = "0x95F35Eb32fEaa8dd025BBf1aaeC157091cCA6dd2";
                abiPath = "./assets/jukebox_v1.2_MM_abi.json";
            } else if (chainId === 137) { // Polygon mainnet chain ID
                console.log("Detected Polygon Network - Loading Polygon contract...");
                contractAddress = "0xACB7850f5836fD9981c7d01F2Ca64628a661f287";
                abiPath = "./assets/jukebox_v1.2_POL_abi.json";
            } else {
                alert("Unsupported network! Please switch to MintMe or Polygon.");
                return;
            }

            // Fetch the ABI and initialize the contract
            const response = await fetch(abiPath);
            if (!response.ok) throw new Error("Failed to load contract ABI.");
            const contractABI = await response.json();

            let jukeboxContract = new ethers.Contract(contractAddress, contractABI, signer);
            console.log("Contract initialized:", jukeboxContract.address);


            return {jukeboxContract, contractAddress, chainId };


        } catch (error) {
            console.error("Error during wallet connection:", error.message || error);
            console.error("Full Error Object:", error);
            alert("Failed to connect wallet. Please try again.");
        }
    } else {
        console.warn("MetaMask not detected.");
        alert("MetaMask is not installed! Please install it to use this app.");
    }
};

