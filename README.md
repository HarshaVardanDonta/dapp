# Decentralized Todo App

A blockchain-based todo application that stores task data on IPFS and task metadata on the Ethereum Sepolia testnet.

## Features

- **Decentralized Storage**: Task content stored on IPFS for permanent, distributed storage
- **Blockchain Metadata**: Task status and timestamps stored on Ethereum
- **Price-Based Automation**: Complete tasks automatically when ETH price reaches thresholds
- **Admin System**: Multi-admin support for task management
- **MetaMask Integration**: Seamless wallet connection and interaction

## Technology Stack

- **Frontend**: React + Vite
- **Blockchain**: Ethereum (Sepolia Testnet)
- **Storage**: IPFS (InterPlanetary File System)
- **Wallet**: MetaMask
- **Smart Contracts**: Solidity
- **Price Oracle**: Chainlink Price Feeds

## Setup Instructions

### Prerequisites

1. **MetaMask**: Install the MetaMask browser extension
2. **Sepolia ETH**: Get test ETH from [Sepolia Faucet](https://sepoliafaucet.com/)
3. **Pinata Account**: Create a free account at [Pinata](https://pinata.cloud) for IPFS

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd dapp
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Add your Pinata API credentials to `.env`:
```
VITE_PINATA_API_KEY=your_pinata_api_key
VITE_PINATA_SECRET_KEY=your_pinata_secret_key
```

5. Start the development server:
```bash
npm run dev
```

### Usage

1. **Connect Wallet**: Click "Connect Wallet" and approve the MetaMask connection
2. **Network**: Ensure you're on Sepolia testnet (the app will prompt to switch if needed)
3. **Add Tasks**: Enter task descriptions - they'll be uploaded to IPFS and hash stored on blockchain
4. **Price Automation**: Set price thresholds to automatically complete tasks when ETH reaches certain prices
5. **Admin Features**: Contract owner can add additional admins

## Smart Contract

- **Address**: `0x09d11A2BC39C97AD705eA2E312aeb9d6ae99ee21`
- **Network**: Sepolia Testnet
- **Features**: Task management, price-based automation, admin system

## IPFS Integration

The app uses IPFS for decentralized storage of task content:

- **Upload**: Task data is uploaded to IPFS via Pinata
- **Storage**: IPFS hash is stored on the blockchain
- **Retrieval**: Task content is fetched from IPFS when displaying tasks
- **Fallback**: If IPFS fails, a local hash is generated for demo purposes

## Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Run linting
npm run lint

# Preview production build
npm run preview
```

## Contract ABI

The contract ABI is available in `dapp_info.txt` for integration purposes.

## Security Notes

- This is a demo application for educational purposes
- API keys are stored in environment variables (not secure for production)
- Use proper key management in production environments
- Always verify contract addresses before interacting