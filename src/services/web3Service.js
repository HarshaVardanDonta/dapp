import { ethers } from 'ethers';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../config/contract.js';

/**
 * Web3Service - A friendly interface for blockchain interactions
 * This service handles wallet connections, smart contract interactions,
 * and makes Web3 accessible for everyday users.
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
     * Connect to the user's wallet (MetaMask)
     * This is the first step to start using the app!
     */
    async connectWallet() {
        if (typeof window.ethereum === 'undefined') {
            throw new Error('Please install MetaMask to use this app! You can download it from metamask.io');
        }

        try {
            console.log('Connecting to your wallet...');

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
            console.log('Successfully connected to wallet:', this.account);

            return this.account;
        } catch (error) {
            console.error('Failed to connect wallet:', error);
            if (error.code === 4001) {
                throw new Error('Connection cancelled. Please try again and approve the connection to continue.');
            }
            throw new Error(`Connection failed: ${error.message}`);
        }
    }

    /**
     * Private helper to ensure we're on Sepolia testnet
     * Users need to be on the test network to use the app safely
     */
    async _ensureCorrectNetwork() {
        const network = await this.provider.getNetwork();
        const sepoliaChainId = 11155111n;

        if (network.chainId !== sepoliaChainId) {
            console.log('Switching to Sepolia testnet...');

            try {
                await window.ethereum.request({
                    method: 'wallet_switchEthereumChain',
                    params: [{ chainId: '0xaa36a7' }], // Sepolia in hex
                });
            } catch (switchError) {
                // Network not added to MetaMask yet
                if (switchError.code === 4902) {
                    console.log('Adding Sepolia testnet to your wallet...');
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
                    throw new Error('Please switch to Sepolia testnet to continue');
                }
            }
        }
    }

    /**
     * Get all your tasks from the blockchain
     * Returns a nice, readable list of tasks with their status
     */
    async getTasks() {
        if (!this._isReady()) {
            throw new Error('Please connect your wallet first to view your tasks');
        }

        try {
            console.log('Fetching your tasks...');
            const tasks = await this.contract.getTasks();

            const formattedTasks = tasks.map((task, index) => ({
                id: index,
                text: task.ipfsHash || `Task ${index + 1}`,
                completed: task.completed,
                createdAt: this._formatDate(Number(task.timestamp)),
                timestamp: Number(task.timestamp),
                status: task.completed ? 'Completed' : 'Pending'
            }));

            console.log(`Found ${formattedTasks.length} tasks`);
            return formattedTasks;
        } catch (error) {
            console.error('Failed to fetch tasks:', error);
            throw new Error('Unable to load your tasks. Please try again.');
        }
    }

    /**
     * Add a new task to the blockchain
     * Your task will be stored permanently and securely!
     */
    async addTask(taskText) {
        if (!this._isReady()) {
            throw new Error('Please connect your wallet first to add tasks');
        }

        if (!taskText || taskText.trim().length === 0) {
            throw new Error('Please enter a task description');
        }

        try {
            console.log('Saving your task to the blockchain...');

            // In a production app, we'd upload to IPFS here
            // For now, we're using the task text directly
            const transaction = await this.contract.addTask(taskText.trim());

            console.log('⏳ Waiting for blockchain confirmation...');
            await transaction.wait();

            console.log('Task saved successfully!');
            return {
                success: true,
                transactionHash: transaction.hash,
                message: 'Your task has been added to the blockchain!'
            };
        } catch (error) {
            console.error('Failed to add task:', error);
            throw new Error(`Unable to save task: ${error.message}`);
        }
    }

    /**
     * Get the total number of tasks you've created
     */
    async getTaskCount() {
        if (!this._isReady()) {
            throw new Error('Please connect your wallet first');
        }

        try {
            const count = await this.contract.getTaskCount();
            const taskCount = Number(count);
            console.log(`You have ${taskCount} tasks total`);
            return taskCount;
        } catch (error) {
            console.error('Error getting task count:', error);
            throw new Error('Unable to count your tasks');
        }
    }

    /**
     * Get the latest price from the oracle
     * This helps with price-based task completion
     */
    async getLatestPrice() {
        if (!this._isReady()) {
            throw new Error('Please connect your wallet first');
        }

        try {
            console.log('Getting latest price from oracle...');
            const price = await this.contract.getLatestPrice();
            const formattedPrice = Number(price);
            console.log(`Current price: $${formattedPrice.toLocaleString()}`);
            return formattedPrice;
        } catch (error) {
            console.error('Error getting latest price:', error);
            throw new Error('Unable to fetch current price. The oracle might be unavailable.');
        }
    }

    /**
     * Complete a task automatically when price reaches a certain threshold
     * This is like setting a smart alarm for your tasks!
     */
    async completeTaskIfPriceAbove(taskIndex, threshold) {
        if (!this._isReady()) {
            throw new Error('Please connect your wallet first');
        }

        if (taskIndex < 0) {
            throw new Error('Please select a valid task');
        }

        if (threshold <= 0) {
            throw new Error('Please enter a valid price threshold');
        }

        try {
            console.log(`Setting up smart completion for task ${taskIndex + 1} when price reaches $${threshold.toLocaleString()}`);

            const transaction = await this.contract.completeTaskIfPriceAbove(taskIndex, threshold);

            console.log('Waiting for blockchain confirmation...');
            await transaction.wait();

            console.log('Smart task completion set up successfully!');
            return {
                success: true,
                transactionHash: transaction.hash,
                message: `Task will auto-complete when price reaches $${threshold.toLocaleString()}`
            };
        } catch (error) {
            console.error('Error setting up smart completion:', error);
            throw new Error(`Unable to set up automatic task completion: ${error.message}`);
        }
    }

    /**
     * Check if an address has admin privileges
     * Admins can manage the system and add other admins
     */
    async isAdmin(address) {
        if (!this._isReady()) {
            throw new Error('Please connect your wallet first');
        }

        if (!address) {
            throw new Error('Please provide a valid address to check');
        }

        try {
            const isAdminUser = await this.contract.admins(address);
            console.log(`Address ${address} ${isAdminUser ? 'is' : 'is not'} an admin`);
            return isAdminUser;
        } catch (error) {
            console.error('Error checking admin status:', error);
            throw new Error('Unable to verify admin status');
        }
    }

    /**
     * Add a new admin to the system
     * Only existing admins can add new admins
     */
    async addAdmin(adminAddress) {
        if (!this._isReady()) {
            throw new Error('Please connect your wallet first');
        }

        if (!adminAddress) {
            throw new Error('Please provide a valid address');
        }

        try {
            console.log(`👥 Adding ${adminAddress} as an admin...`);

            const transaction = await this.contract.addAdmin(adminAddress);

            console.log('Waiting for blockchain confirmation...');
            await transaction.wait();

            console.log('New admin added successfully!');
            return {
                success: true,
                transactionHash: transaction.hash,
                message: `${adminAddress} is now an admin`
            };
        } catch (error) {
            console.error('Error adding admin:', error);
            if (error.message.includes('revert')) {
                throw new Error('Only existing admins can add new admins');
            }
            throw new Error(`Unable to add admin: ${error.message}`);
        }
    }

    /**
     * Check if wallet is connected and ready to use
     */
    isConnected() {
        return this.account !== null && this.isInitialized;
    }

    /**
     * Get the currently connected wallet address
     */
    getAccount() {
        return this.account;
    }

    /**
     * Get a user-friendly version of the wallet address
     * Shows first and last few characters with ... in between
     */
    getFormattedAccount() {
        if (!this.account) return null;
        return `${this.account.slice(0, 6)}...${this.account.slice(-4)}`;
    }

    /**
     * Private helper to check if service is ready for blockchain operations
     */
    _isReady() {
        return this.contract && this.isInitialized;
    }

    /**
     * Private helper to format timestamps into readable dates
     */
    _formatDate(timestamp) {
        if (!timestamp) return 'Unknown';
        return new Date(timestamp * 1000).toLocaleString();
    }

    /**
     * Disconnect wallet and reset the service
     */
    disconnect() {
        console.log('Disconnecting wallet...');
        this.provider = null;
        this.signer = null;
        this.contract = null;
        this.account = null;
        this.isInitialized = false;
        console.log('Wallet disconnected');
    }
}

export default new Web3Service();
