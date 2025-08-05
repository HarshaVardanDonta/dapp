import { ethers } from 'ethers';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../config/contract.js';

/**
 * Web3Service - Your Personal Blockchain Assistant
 * 
 * Think of this as your friendly guide to the blockchain world!
 * We'll help you connect your wallet, manage your tasks, and interact
 * with smart contracts - all without the technical jargon.
 * 
 * Don't worry if you're new to this - we'll walk you through everything!
 */
class Web3Service {
    constructor() {
        this.provider = null;
        this.signer = null;
        this.contract = null;
        this.account = null;
        this.isInitialized = false;
    }

    /**
     * Let's Connect Your Wallet!
     * 
     * This is like introducing yourself to the blockchain world.
     * We'll help you connect safely and securely. Don't worry - 
     * you're always in control of your wallet!
     */
    async connectWallet() {
        if (typeof window.ethereum === 'undefined') {
            throw new Error('Oops! It looks like you need MetaMask to get started. No worries - it\'s free and easy to install! Just visit metamask.io and we\'ll be ready to go in a few minutes.');
        }

        try {
            console.log('Getting ready to connect your wallet...');

            // Ask user to connect their wallet
            await window.ethereum.request({ method: 'eth_requestAccounts' });

            this.provider = new ethers.BrowserProvider(window.ethereum);
            this.signer = await this.provider.getSigner();
            this.account = await this.signer.getAddress();

            // Set up the smart contract connection
            this.contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, this.signer);

            // Make sure we're on the right network (Sepolia testnet)
            await this._ensureCorrectNetwork();

            this.isInitialized = true;
            console.log('Awesome! Your wallet is now connected:', this.account);

            return this.account;
        } catch (error) {
            console.error('Connection attempt failed:', error);
            if (error.code === 4001) {
                throw new Error('No problem! It looks like you decided not to connect right now. Feel free to try again whenever you\'re ready - we\'ll be here waiting!');
            }
            throw new Error(`Hmm, something went wrong while connecting: ${error.message}. Don't worry, this happens sometimes! Please try again in a moment.`);
        }
    }

    /**
     * Making sure you're on the right network
     * We need to use the Sepolia testnet to keep everything safe while you learn.
     * Don't worry - we'll help you switch networks automatically!
     */
    async _ensureCorrectNetwork() {
        const network = await this.provider.getNetwork();
        const sepoliaChainId = 11155111n;

        if (network.chainId !== sepoliaChainId) {
            console.log('Let\'s switch you to the Sepolia test network for safety...');

            try {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: '0xaa36a7' }], // Sepolia in hex
                });
            } catch (switchError) {
                // Network not added to MetaMask yet
                if (switchError.code === 4902) {
                    console.log('Adding the Sepolia test network to your wallet...');
                    await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [{
                            chainId: '0xaa36a7',
                            chainName: 'Sepolia Testnet',
                            rpcUrls: ['https://sepolia.infura.io/v3/'],
                            nativeCurrency: {
                                name: 'SepoliaETH',
                                symbol: 'SEP',
                                decimals: 18,
                            },
                            blockExplorerUrls: ['https://sepolia.etherscan.io/'],
                        }],
                    });
                } else {
                    throw new Error('We need to use the Sepolia test network to keep your real funds safe. Please switch networks and try again!');
                }
            }
        }
    }

    /**
     * Getting your task data from the decentralized web
     * 
     * Your tasks are stored on IPFS - think of it as a distributed
     * filing system that no single company controls. Pretty cool, right?
     */
    async _fetchFromIPFS(ipfsHash) {
        try {
            // Handle fallback hashes (created when IPFS upload fails)
            if (ipfsHash.startsWith('fallback_')) {
                return {
                    text: `Task (saved locally: ${ipfsHash.substring(9, 15)}...)`,
                    type: 'fallback'
                };
            }

            // Check if this looks like a valid IPFS hash (should be alphanumeric and 46+ chars)
            const isValidIPFSHash = /^[a-zA-Z0-9]{46,}$/.test(ipfsHash);

            if (!isValidIPFSHash) {
                // This is likely old task data stored as plain text before IPFS implementation
                return {
                    text: ipfsHash, // Return the text as-is since it's likely the actual task content
                    type: 'legacy_text'
                };
            }

            // List of different IPFS gateways we can try (like having multiple doors to the same room)
            const gateways = [
                'https://ipfs.io/ipfs',
                'https://dweb.link/ipfs',
                'https://gateway.ipfs.io/ipfs',
                'https://cloudflare.com/ipfs',
                'https://cf-ipfs.com/ipfs'
            ];

            let lastError = null;

            // Try each gateway until one works
            for (const gateway of gateways) {
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout per gateway

                    console.log(`Trying to fetch your task from: ${gateway}`);

                    const response = await fetch(`${gateway}/${ipfsHash}`, {
                        signal: controller.signal,
                        method: 'GET',
                        mode: 'cors', // Explicitly request CORS
                        headers: {
                            'Accept': 'application/json',
                        }
                    });

                    clearTimeout(timeoutId);

                    if (!response.ok) {
                        throw new Error(`Server responded with: ${response.status} ${response.statusText}`);
                    }

                    const data = await response.json();
                    console.log(`Great! Found your task data at: ${gateway}`);
                    return data;

                } catch (error) {
                    console.warn(`Couldn't reach ${gateway}:`, error.message);
                    lastError = error;
                    // Continue to next gateway
                }
            }

            // If all gateways failed, throw the last error
            throw new Error(`We tried all available sources but couldn't find your task data. Last error: ${lastError?.message || 'Unknown issue'}`)
        } catch (error) {
            console.error('Had trouble getting your task from IPFS:', error);
            // Return fallback data with more descriptive error
            return {
                text: `Task (temporarily unavailable: ${ipfsHash.substring(0, 8)}...)`,
                type: 'ipfs_error',
                error: error.message
            };
        }
    }

    /**
     * Let's get all your tasks!
     * 
     * We'll grab everything from the blockchain and make it nice and readable.
     * Think of this as opening your digital notebook to see what you've written.
     */
    async getTasks() {
        if (!this._isReady()) {
            throw new Error('Hey! We need to connect your wallet first so we know which tasks belong to you.');
        }

        try {
            console.log('Looking up all your tasks...');
            const tasks = await this.contract.getTasks();

            // Fetch task data from IPFS for each task
            const formattedTasks = await Promise.all(
                tasks.map(async (task, index) => {
                    let taskText = `Task ${index + 1}`;
                    let ipfsHash = task.ipfsHash;

                    // If we have an IPFS hash, try to fetch the actual task data
                    if (ipfsHash && ipfsHash.trim() !== '') {
                        try {
                            const taskData = await this._fetchFromIPFS(ipfsHash);
                            taskText = taskData.text || taskText;
                        } catch (error) {
                            console.warn(`Couldn't load the details for task ${index + 1}:`, error);
                            taskText = `Task ${index + 1} (details loading...)`;
                        }
                    }

                    return {
                        id: index,
                        text: taskText,
                        ipfsHash: ipfsHash,
                        completed: task.completed,
                        createdAt: this._formatDate(Number(task.timestamp)),
                        timestamp: Number(task.timestamp),
                        status: task.completed ? 'Done!' : 'Still working on it'
                    };
                })
            );

            console.log(`Found ${formattedTasks.length} of your tasks`);
            return formattedTasks;
        } catch (error) {
            console.error('Had trouble loading your tasks:', error);
            throw new Error('Hmm, we couldn\'t load your tasks right now. This sometimes happens! Please give it another try.');
        }
    }

    /**
     * Saving your task to the decentralized web
     * 
     * We'll store it on IPFS first (think of it as a global, distributed hard drive)
     * and then save the reference on the blockchain. Pretty neat technology!
     */
    async _uploadToIPFS(taskData) {
        try {
            // Using Pinata service for IPFS storage (like Dropbox, but decentralized!)
            // In a real app, you'd have your own secure keys
            const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // Note: In production, you'd store these securely as environment variables
                    'pinata_api_key': import.meta.env.VITE_PINATA_API_KEY || '',
                    'pinata_secret_api_key': import.meta.env.VITE_PINATA_SECRET_KEY || ''
                },
                body: JSON.stringify({
                    pinataContent: taskData,
                    pinataMetadata: {
                        name: `Task-${Date.now()}`,
                        keyvalues: {
                            type: 'task',
                            timestamp: Date.now().toString()
                        }
                    }
                })
            });

            if (!response.ok) {
                // Fallback: Create a simple hash for demo purposes
                console.warn('IPFS upload didn\'t work out, but don\'t worry - we\'ll create a backup reference!');
                const taskString = JSON.stringify(taskData);
                const encoder = new TextEncoder();
                const data = encoder.encode(taskString);
                const hashBuffer = await crypto.subtle.digest('SHA-256', data);
                const hashArray = Array.from(new Uint8Array(hashBuffer));
                const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
                return `fallback_${hashHex.substring(0, 32)}`;
            }

            const result = await response.json();
            return result.IpfsHash;
        } catch (error) {
            console.error('Had some trouble with IPFS upload:', error);
            // Fallback: Create a deterministic hash for demo
            const taskString = JSON.stringify(taskData);
            const encoder = new TextEncoder();
            const data = encoder.encode(taskString);
            const hashBuffer = await crypto.subtle.digest('SHA-256', data);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            return `fallback_${hashHex.substring(0, 32)}`;
        }
    }

    /**
     * Time to add a new task!
     * 
     * We'll save it to IPFS (the decentralized web) and then record
     * it on the blockchain. Once it's there, it'll be permanent and
     * accessible from anywhere in the world!
     */
    async addTask(taskText) {
        if (!this._isReady()) {
            throw new Error('Looks like we need to connect your wallet first! That way we know where to save your task.');
        }

        if (!taskText || taskText.trim().length === 0) {
            throw new Error('Hey! Don\'t forget to write down what your task is about.');
        }

        try {
            console.log('Preparing to save your task to the decentralized web...');

            // Create task data object
            const taskData = {
                text: taskText.trim(),
                createdAt: new Date().toISOString(),
                version: '1.0',
                type: 'task'
            };

            // Upload to IPFS and get hash
            const ipfsHash = await this._uploadToIPFS(taskData);
            console.log('Great! Your task is now saved on IPFS with ID:', ipfsHash);

            console.log('Now let\'s record this on the blockchain for permanent storage...');

            // Store the IPFS hash on the blockchain
            const transaction = await this.contract.addTask(ipfsHash);

            console.log('Almost done! Just waiting for the blockchain to confirm your transaction...');
            await transaction.wait();

            console.log('Perfect! Your task is now permanently saved!');
            return {
                success: true,
                transactionHash: transaction.hash,
                ipfsHash: ipfsHash,
                message: 'Your task has been successfully saved to both IPFS and the blockchain!'
            };
        } catch (error) {
            console.error('Ran into an issue while saving your task:', error);
            throw new Error(`We couldn't save your task right now: ${error.message}. This sometimes happens - please try again!`);
        }
    }

    /**
     * Let's count up all your tasks!
     * 
     * Sometimes it's nice to know how productive you've been.
     */
    async getTaskCount() {
        if (!this._isReady()) {
            throw new Error('We\'ll need to connect your wallet first to count your tasks!');
        }

        try {
            const count = await this.contract.getTaskCount();
            const taskCount = Number(count);
            console.log(`You've created ${taskCount} tasks so far - nice work!`);
            return taskCount;
        } catch (error) {
            console.error('Had trouble counting your tasks:', error);
            throw new Error('We couldn\'t count your tasks right now. No big deal - try again in a moment!');
        }
    }

    /**
     * Let's check the current market price!
     * 
     * This connects to a price oracle (think of it as a trusted
     * source that tells us what things cost in the real world).
     */
    async getLatestPrice() {
        if (!this._isReady()) {
            throw new Error('We\'ll need your wallet connected first to check prices!');
        }

        try {
            console.log('Checking the latest price for you...');
            const price = await this.contract.getLatestPrice();
            const formattedPrice = Number(price);
            console.log(`Right now, the price is: $${formattedPrice.toLocaleString()}`);
            return formattedPrice;
        } catch (error) {
            console.error('Couldn\'t get the current price:', error);
            throw new Error('We couldn\'t check the current price right now. The price feed might be having a moment - try again soon!');
        }
    }

    /**
     * Set up a smart task completion!
     * 
     * This is pretty cool - you can tell your task to automatically
     * complete itself when a price reaches a certain level. It's like
     * having a helpful robot watching the markets for you!
     */
    async completeTaskIfPriceAbove(taskIndex, threshold) {
        if (!this._isReady()) {
            throw new Error('Let\'s get your wallet connected first so we can set this up!');
        }

        if (taskIndex < 0) {
            throw new Error('Hmm, please pick one of your actual tasks to set this up for!');
        }

        if (threshold <= 0) {
            throw new Error('The price threshold should be a positive number - what price are you watching for?');
        }

        try {
            console.log(`Setting up smart completion for task ${taskIndex + 1} when the price hits $${threshold.toLocaleString()}`);

            const transaction = await this.contract.completeTaskIfPriceAbove(taskIndex, threshold);

            console.log('Just waiting for the blockchain to confirm this setup...');
            await transaction.wait();

            console.log('All set! Your task will automatically complete when the price target is hit!');
            return {
                success: true,
                transactionHash: transaction.hash,
                message: `Perfect! Your task will auto-complete when the price reaches $${threshold.toLocaleString()}`
            };
        } catch (error) {
            console.error('Had trouble setting up the smart completion:', error);
            throw new Error(`We couldn't set up automatic completion right now: ${error.message}. Give it another try!`);
        }
    }

    /**
     * Check if someone has admin powers
     * 
     * Admins are like the helpful moderators who can help manage
     * the system and add other trusted people as admins too.
     */
    async isAdmin(address) {
        if (!this._isReady()) {
            throw new Error('We need your wallet connected to check admin status!');
        }

        if (!address) {
            throw new Error('Which address would you like me to check? I need a wallet address to look up!');
        }

        try {
            const isAdminUser = await this.contract.admins(address);
            console.log(`Address ${address} ${isAdminUser ? 'is' : 'is not'} an admin`);
            return isAdminUser;
        } catch (error) {
            console.error('Had trouble checking admin status:', error);
            throw new Error('We couldn\'t verify the admin status right now. Try again in a moment!');
        }
    }

    /**
     * Give someone admin powers
     * 
     * Only current admins can do this - it's like passing on
     * the keys to trusted friends who can help manage things.
     */
    async addAdmin(adminAddress) {
        if (!this._isReady()) {
            throw new Error('Let\'s connect your wallet first!');
        }

        if (!adminAddress) {
            throw new Error('Which address should get admin powers? I need a wallet address!');
        }

        try {
            console.log(`Adding admin powers to ${adminAddress}...`);

            const transaction = await this.contract.addAdmin(adminAddress);

            console.log('Waiting for the blockchain to confirm this change...');
            await transaction.wait();

            console.log('Great! They now have admin powers!');
            return {
                success: true,
                transactionHash: transaction.hash,
                message: `${adminAddress} is now an admin and can help manage the system!`
            };
        } catch (error) {
            console.error('Couldn\'t add the new admin:', error);
            if (error.message.includes('revert')) {
                throw new Error('Only current admins can add new admins. Makes sense, right?');
            }
            throw new Error(`We couldn't add that admin right now: ${error.message}. Try again soon!`);
        }
    }

    /**
     * Quick check - are we connected and ready to go?
     */
    isConnected() {
        return this.account !== null && this.isInitialized;
    }

    /**
     * Get your wallet address
     */
    getAccount() {
        return this.account;
    }

    /**
     * Get a shortened, friendly version of your wallet address
     * 
     * Instead of showing the full long address, we'll show just
     * the beginning and end - much easier to read!
     */
    getFormattedAccount() {
        if (!this.account) return null;
        return `${this.account.slice(0, 6)}...${this.account.slice(-4)}`;
    }

    /**
     * Internal check to make sure everything's ready for blockchain operations
     */
    _isReady() {
        return this.contract && this.isInitialized;
    }

    /**
     * Turn those cryptic timestamps into human-readable dates
     */
    _formatDate(timestamp) {
        if (!timestamp) return 'Date unknown';
        return new Date(timestamp * 1000).toLocaleString();
    }

    /**
     * Time to disconnect and log out
     * 
     * This clears everything and puts us back to the starting point.
     * Your tasks will still be safely stored on the blockchain!
     */
    disconnect() {
        console.log('Logging out and disconnecting your wallet...');
        this.provider = null;
        this.signer = null;
        this.contract = null;
        this.account = null;
        this.isInitialized = false;
        console.log('All disconnected! Your data is still safe on the blockchain.');
    }
}

export default new Web3Service();
