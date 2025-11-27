// Contract artifacts loader - loads actual compiled contract artifacts
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { Abi } from 'viem';

interface ContractArtifact {
  abi: Abi;
  bytecode: {
    object: string;
  };
}

/**
 * Load contract artifacts from the build output
 */
export function loadContractArtifacts(): Record<string, ContractArtifact> {
  const contractsPath = join(process.cwd(), '../contracts/out');
  
  const contracts = {
    tokenImplementation: 'SimpleDAOTokenUpgradeable.sol/SimpleDAOTokenUpgradeable.json',
    governorImplementation: 'SimpleDAOGovernorUpgradeable.sol/SimpleDAOGovernorUpgradeable.json',
    timelockImplementation: 'SimpleDAOTimelockUpgradeable.sol/SimpleDAOTimelockUpgradeable.json',
    factory: 'SimpleDAOFactoryV2.sol/SimpleDAOFactoryV2.json',
  };

  const artifacts: Record<string, ContractArtifact> = {};

  for (const [key, path] of Object.entries(contracts)) {
    const artifactPath = join(contractsPath, path);
    
    if (existsSync(artifactPath)) {
      try {
        const artifactData = JSON.parse(readFileSync(artifactPath, 'utf8'));
        artifacts[key] = {
          abi: artifactData.abi,
          bytecode: artifactData.bytecode,
        };
      } catch (error) {
        throw new Error(`Failed to load contract artifact: ${key}`);
      }
    } else {
      throw new Error(`Contract artifact not found: ${key}`);
    }
  }

  return artifacts;
}

/**
 * Get a specific contract artifact
 */
export function getContractArtifact(contractName: string): ContractArtifact {
  const artifacts = loadContractArtifacts();
  
  if (!artifacts[contractName]) {
    throw new Error(`Contract artifact not found: ${contractName}`);
  }
  
  return artifacts[contractName];
}

/**
 * Validate that all required artifacts are available
 */
export function validateArtifacts(): boolean {
  try {
    const artifacts = loadContractArtifacts();
    const requiredContracts = ['tokenImplementation', 'governorImplementation', 'timelockImplementation', 'factory'];
    
    for (const contract of requiredContracts) {
      if (!artifacts[contract]) {
        return false;
      }

      if (!artifacts[contract].abi || artifacts[contract].abi.length === 0) {
        return false;
      }

      if (!artifacts[contract].bytecode || !artifacts[contract].bytecode.object || artifacts[contract].bytecode.object === '0x') {
        return false;
      }
    }

    return true;
  } catch (error) {
    return false;
  }
}