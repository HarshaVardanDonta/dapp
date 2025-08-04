import { ethers } from 'ethers';
import { CONTRACT_ADDRESS, CONTRACT_ABI } from '../config/contract.js';

class Web3Service {
    constructor() {
        this.provider = null;
        this.signer = null;
        this.contract = null;
        this.account = null;
    }

    async connectWallet() {
        if (typeof window.ethereum !== 'undefined') {
            try {
                // Request account access
                await window.ethereum.request({ method: 'eth_requestAccounts' });

                this.provider = new ethers.BrowserProvider(window.ethereum);
                this.signer = await this.provider.getSigner();
                this.account = await this.signer.getAddress();

                // Initialize contract
                this.contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, this.signer);

                // Check if we're on Sepolia network
                const network = await this.provider.getNetwork();
                if (network.chainId !== 11155111n) { // Sepolia chain ID
                    try {
                        await window.ethereum.request({
                            method: 'wallet_switchEthereumChain',
                            params: [{ chainId: '0xaa36a7' }], // Sepolia chain ID in hex
                        });
                    } catch (switchError) {
                        // This error code indicates that the chain has not been added to MetaMask
                        if (switchError.code === 4902) {
                            await window.ethereum.request({
                                method: 'wallet_addEthereumChain',
                                params: [
                                    {
                                        chainId: '0xaa36a7',
                                        chainName: 'Sepolia Testnet',
                                        rpcUrls: ['https://sepolia.infura.io/v3/'],
                                        nativeCurrency: {
                                            name: 'SepoliaETH',
                                            symbol: 'SEP',
                                            decimals: 18,
                                        },
                                        blockExplorerUrls: ['https://sepolia.etherscan.io/'],
                                    },
                                ],
                            });
                        }
                    }
                }

                return this.account;
            } catch (error) {
                console.error('Error connecting wallet:', error);
                throw error;
            }
        } else {
            throw new Error('MetaMask is not installed');
        }
    }

    async getTasks() {
        if (!this.contract) throw new Error('Contract not initialized');

        try {
            const tasks = await this.contract.getTasks();
            return tasks.map((task, index) => ({
                id: index,
                ipfsHash: task.ipfsHash,
                completed: task.completed,
                timestamp: Number(task.timestamp),
                // For demo purposes, we'll use the ipfsHash as the task text
                // In a real app, you'd fetch the actual content from IPFS
                text: task.ipfsHash || `Task ${index + 1}`
            }));
        } catch (error) {
            console.error('Error fetching tasks:', error);
            throw error;
        }
    }

    async addTask(taskText) {
        if (!this.contract) throw new Error('Contract not initialized');

        try {
            // For demo purposes, we're using the task text as the IPFS hash
            // In a real app, you'd upload to IPFS and use the returned hash
            const tx = await this.contract.addTask(taskText);
            await tx.wait();
            return tx;
        } catch (error) {
            console.error('Error adding task:', error);
            throw error;
        }
    }

    async getTaskCount() {
        if (!this.contract) throw new Error('Contract not initialized');

        try {
            const count = await this.contract.getTaskCount();
            return Number(count);
        } catch (error) {
            console.error('Error getting task count:', error);
            throw error;
        }
    }

    async getLatestPrice() {
        if (!this.contract) throw new Error('Contract not initialized');

        try {
            const price = await this.contract.getLatestPrice();
            return Number(price);
        } catch (error) {
            console.error('Error getting latest price:', error);
            throw error;
        }
    }

    async completeTaskIfPriceAbove(taskIndex, threshold) {
        if (!this.contract) throw new Error('Contract not initialized');

        try {
            const tx = await this.contract.completeTaskIfPriceAbove(taskIndex, threshold);
            await tx.wait();
            return tx;
        } catch (error) {
            console.error('Error completing task:', error);
            throw error;
        }
    }

    async isAdmin(address) {
        if (!this.contract) throw new Error('Contract not initialized');

        try {
            return await this.contract.admins(address);
        } catch (error) {
            console.error('Error checking admin status:', error);
            throw error;
        }
    }

    async addAdmin(adminAddress) {
        if (!this.contract) throw new Error('Contract not initialized');

        try {
            const tx = await this.contract.addAdmin(adminAddress);
            await tx.wait();
            return tx;
        } catch (error) {
            console.error('Error adding admin:', error);
            throw error;
        }
    }

    isConnected() {
        return this.account !== null;
    }

    getAccount() {
        return this.account;
    }
}

export default new Web3Service();
