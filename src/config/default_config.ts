import { RPCConfig } from '../types';

export const DEFAULT_RPC_CONFIG: RPCConfig = {
  chains: {
    "1": {
      chainId: 1,
      name: "Ethereum Mainnet",
      symbol: "ETH",
      blockExplorerUrl: "https://etherscan.io",
      rpcs: [
        {
          url: "https://eth.llamarpc.com",
          name: "LlamaRPC",
          priority: 10,
          timeout: 30000,
          maxRetries: 3,
          isActive: true
        },
        {
          url: "https://rpc.ankr.com/eth",
          name: "Ankr",
          priority: 9,
          timeout: 30000,
          maxRetries: 3,
          isActive: true
        },
        {
          url: "https://ethereum.publicnode.com",
          name: "PublicNode",
          priority: 8,
          timeout: 30000,
          maxRetries: 3,
          isActive: true
        }
      ]
    },
    "137": {
      chainId: 137,
      name: "Polygon Mainnet",
      symbol: "MATIC",
      blockExplorerUrl: "https://polygonscan.com",
      rpcs: [
        {
          url: "https://polygon.llamarpc.com",
          name: "LlamaRPC",
          priority: 10,
          timeout: 30000,
          maxRetries: 3,
          isActive: true
        },
        {
          url: "https://rpc.ankr.com/polygon",
          name: "Ankr",
          priority: 9,
          timeout: 30000,
          maxRetries: 3,
          isActive: true
        },
        {
          url: "https://polygon.publicnode.com",
          name: "PublicNode",
          priority: 8,
          timeout: 30000,
          maxRetries: 3,
          isActive: true
        }
      ]
    },
    "56": {
      chainId: 56,
      name: "BNB Smart Chain",
      symbol: "BNB",
      blockExplorerUrl: "https://bscscan.com",
      rpcs: [
        {
          url: "https://binance.llamarpc.com",
          name: "LlamaRPC",
          priority: 10,
          timeout: 30000,
          maxRetries: 3,
          isActive: true
        },
        {
          url: "https://rpc.ankr.com/bsc",
          name: "Ankr",
          priority: 9,
          timeout: 30000,
          maxRetries: 3,
          isActive: true
        },
        {
          url: "https://bsc.publicnode.com",
          name: "PublicNode",
          priority: 8,
          timeout: 30000,
          maxRetries: 3,
          isActive: true
        }
      ]
    },
    "42161": {
      chainId: 42161,
      name: "Arbitrum One",
      symbol: "ETH",
      blockExplorerUrl: "https://arbiscan.io",
      rpcs: [
        {
          url: "https://arbitrum.llamarpc.com",
          name: "LlamaRPC",
          priority: 10,
          timeout: 30000,
          maxRetries: 3,
          isActive: true
        },
        {
          url: "https://rpc.ankr.com/arbitrum",
          name: "Ankr",
          priority: 9,
          timeout: 30000,
          maxRetries: 3,
          isActive: true
        },
        {
          url: "https://arbitrum.publicnode.com",
          name: "PublicNode",
          priority: 8,
          timeout: 30000,
          maxRetries: 3,
          isActive: true
        }
      ]
    },
    "10": {
      chainId: 10,
      name: "Optimism",
      symbol: "ETH",
      blockExplorerUrl: "https://optimistic.etherscan.io",
      rpcs: [
        {
          url: "https://optimism.llamarpc.com",
          name: "LlamaRPC",
          priority: 10,
          timeout: 30000,
          maxRetries: 3,
          isActive: true
        },
        {
          url: "https://rpc.ankr.com/optimism",
          name: "Ankr",
          priority: 9,
          timeout: 30000,
          maxRetries: 3,
          isActive: true
        },
        {
          url: "https://optimism.publicnode.com",
          name: "PublicNode",
          priority: 8,
          timeout: 30000,
          maxRetries: 3,
          isActive: true
        }
      ]
    },
    "sol-dev": {
      chainId: "sol-dev",
      name: "Solana Devnet",
      symbol: "SOL",
      blockExplorerUrl: "https://explorer.solana.com/?cluster=devnet",
      rpcs: [
        {
          url: "https://api.devnet.solana.com",
          name: "Solana Official Devnet",
          priority: 10,
          timeout: 30000,
          maxRetries: 3,
          isActive: true
        },
        {
          url: "https://solana-devnet.api.onfinality.io/public",
          name: "OnFinality Devnet",
          priority: 9,
          timeout: 30000,
          maxRetries: 3,
          isActive: true
        }
      ]
    },
    "sol-main": {
      chainId: "sol-main",
      name: "Solana Mainnet",
      symbol: "SOL",
      blockExplorerUrl: "https://explorer.solana.com",
      rpcs: [
        {
          url: "https://public.rpc.solanavibestation.com/",
          name: "Solana Vibe Station",
          priority: 10,
          timeout: 30000,
          maxRetries: 3,
          isActive: true
        },
        {
          url: "https://solana.therpc.io",
          name: "TheRPC",
          priority: 9,
          timeout: 30000,
          maxRetries: 3,
          isActive: true
        },
        {
          url: "https://solana.drpc.org",
          name: "dRPC",
          priority: 8,
          timeout: 30000,
          maxRetries: 3,
          isActive: true
        },
        {
          url: "https://api.mainnet-beta.solana.com",
          name: "Solana Official Mainnet",
          priority: 7,
          timeout: 30000,
          maxRetries: 3,
          isActive: true
        }
      ]
    }
  },
  globalSettings: {
    defaultTimeout: 30000,
    defaultMaxRetries: 3,
    healthCheckInterval: 300000 // 5 minutes
  }
};