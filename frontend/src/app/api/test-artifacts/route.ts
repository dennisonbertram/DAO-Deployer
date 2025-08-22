// Test endpoint to validate contract artifacts loading
import { NextResponse } from 'next/server';
import { validateArtifacts, loadContractArtifacts } from '@/lib/contracts/artifacts';

export async function GET() {
  try {
    console.log('Testing artifact loading...');
    
    // Test artifact validation
    const isValid = validateArtifacts();
    console.log('Artifacts validation result:', isValid);
    
    if (!isValid) {
      return NextResponse.json({
        success: false,
        error: 'Artifact validation failed',
        details: 'One or more contract artifacts are missing or invalid'
      }, { status: 500 });
    }
    
    // Load artifacts
    const artifacts = loadContractArtifacts();
    
    // Return summary info
    const summary = Object.entries(artifacts).reduce((acc, [key, artifact]) => {
      acc[key] = {
        hasAbi: !!artifact.abi && artifact.abi.length > 0,
        abiLength: artifact.abi.length,
        hasBytecode: !!artifact.bytecode && artifact.bytecode.object !== '0x',
        bytecodeLength: artifact.bytecode.object.length,
        hasConstructor: artifact.abi.some((item: any) => item.type === 'constructor'),
      };
      return acc;
    }, {} as Record<string, any>);
    
    return NextResponse.json({
      success: true,
      message: 'Artifacts loaded successfully',
      summary,
    });
    
  } catch (error) {
    console.error('Artifact test failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to load artifacts',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}