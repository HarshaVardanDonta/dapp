// Utility functions for the dApp

export const formatAddress = (address) => {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    return new Date(timestamp * 1000).toLocaleString();
};

export const formatPrice = (price) => {
    if (!price) return '0';
    // Convert from 8 decimal places (Chainlink price feeds typically use 8 decimals)
    return (price / 100000000).toFixed(2);
};

export const truncateText = (text, maxLength = 50) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + '...';
};

export const isValidEthereumAddress = (address) => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
};

export const copyToClipboard = async (text) => {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch (err) {
        console.error('Failed to copy: ', err);
        return false;
    }
};

export const getNetworkName = (chainId) => {
    const networks = {
        1: 'Ethereum Mainnet',
        3: 'Ropsten Testnet',
        4: 'Rinkeby Testnet',
        5: 'Goerli Testnet',
        11155111: 'Sepolia Testnet',
        137: 'Polygon Mainnet',
        80001: 'Mumbai Testnet',
    };
    return networks[chainId] || `Unknown Network (${chainId})`;
};

export const handleError = (error) => {
    console.error('Error:', error);

    // Common error messages
    if (error.code === 4001) {
        return 'Transaction rejected by user';
    }
    if (error.code === -32603) {
        return 'Internal JSON-RPC error';
    }
    if (error.message?.includes('insufficient funds')) {
        return 'Insufficient funds for transaction';
    }
    if (error.message?.includes('user rejected')) {
        return 'Transaction rejected by user';
    }

    return error.message || 'An unknown error occurred';
};
