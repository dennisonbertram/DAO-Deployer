#!/bin/bash

# Local Development Setup Script for DAO Deployer
# This script starts Anvil, deploys contracts, and runs the frontend

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ANVIL_PORT=8545
ANVIL_HOST="127.0.0.1"
FRONTEND_PORT=3000
CONTRACTS_DIR="./contracts"
FRONTEND_DIR="./frontend"
ANVIL_PID_FILE=".anvil.pid"
FRONTEND_PID_FILE=".frontend.pid"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to cleanup processes on exit
cleanup() {
    print_status "Shutting down local development environment..."
    
    # Stop Anvil
    if [ -f "$ANVIL_PID_FILE" ]; then
        ANVIL_PID=$(cat "$ANVIL_PID_FILE")
        if ps -p $ANVIL_PID > /dev/null 2>&1; then
            print_status "Stopping Anvil (PID: $ANVIL_PID)"
            kill $ANVIL_PID
        fi
        rm -f "$ANVIL_PID_FILE"
    fi
    
    # Stop Frontend
    if [ -f "$FRONTEND_PID_FILE" ]; then
        FRONTEND_PID=$(cat "$FRONTEND_PID_FILE")
        if ps -p $FRONTEND_PID > /dev/null 2>&1; then
            print_status "Stopping Frontend (PID: $FRONTEND_PID)"
            kill $FRONTEND_PID
        fi
        rm -f "$FRONTEND_PID_FILE"
    fi
    
    # Clean up any remaining processes on the ports
    pkill -f "anvil.*$ANVIL_PORT" || true
    pkill -f "next.*dev.*$FRONTEND_PORT" || true
    
    print_success "Cleanup complete"
    exit 0
}

# Set trap to cleanup on script exit
trap cleanup EXIT SIGINT SIGTERM

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to wait for port to be available
wait_for_port() {
    local port=$1
    local max_attempts=30
    local attempt=1
    
    print_status "Waiting for port $port to be available..."
    
    while [ $attempt -le $max_attempts ]; do
        if nc -z localhost $port 2>/dev/null; then
            return 0
        fi
        sleep 1
        attempt=$((attempt + 1))
    done
    
    return 1
}

# Function to check if port is in use
port_in_use() {
    nc -z localhost $1 2>/dev/null
}

# Main function
main() {
    print_status "Starting DAO Deployer Local Development Environment"
    print_status "============================================="
    
    # Check prerequisites
    if ! command_exists anvil; then
        print_error "Anvil not found. Please install Foundry: https://getfoundry.sh"
        exit 1
    fi
    
    if ! command_exists npm; then
        print_error "npm not found. Please install Node.js and npm"
        exit 1
    fi
    
    # Check if ports are already in use
    if port_in_use $ANVIL_PORT; then
        print_warning "Port $ANVIL_PORT is already in use. Attempting to free it..."
        pkill -f "anvil.*$ANVIL_PORT" || true
        sleep 2
    fi
    
    if port_in_use $FRONTEND_PORT; then
        print_warning "Port $FRONTEND_PORT is already in use. Frontend will use next available port."
    fi
    
    # Step 1: Start Anvil
    print_status "Starting Anvil local blockchain..."
    cd "$CONTRACTS_DIR"
    
    # Start Anvil in background
    anvil --host $ANVIL_HOST --port $ANVIL_PORT --accounts 10 --balance 10000 > ../anvil.log 2>&1 &
    ANVIL_PID=$!
    echo $ANVIL_PID > "../$ANVIL_PID_FILE"
    
    print_success "Anvil started (PID: $ANVIL_PID)"
    print_status "  - RPC URL: http://$ANVIL_HOST:$ANVIL_PORT"
    print_status "  - Chain ID: 31337"
    print_status "  - Accounts: 10 (each with 10000 ETH)"
    
    # Wait for Anvil to be ready
    if ! wait_for_port $ANVIL_PORT; then
        print_error "Anvil failed to start on port $ANVIL_PORT"
        exit 1
    fi
    
    # Step 2: Build contracts
    print_status "Building smart contracts..."
    if ! npm run build; then
        print_error "Contract build failed"
        exit 1
    fi
    print_success "Contracts built successfully"
    
    # Step 3: Deploy contracts to Anvil
    print_status "Deploying contracts to local blockchain..."
    if ! npm run deploy:local; then
        print_error "Contract deployment failed"
        exit 1
    fi
    print_success "Contracts deployed successfully"
    
    # Step 4: Copy contract addresses to frontend
    if [ -f "local-contracts.json" ]; then
        cp local-contracts.json "../frontend/public/"
        print_success "Contract addresses copied to frontend"
    else
        print_error "local-contracts.json not found"
        exit 1
    fi
    
    # Step 5: Install frontend dependencies
    cd "../$FRONTEND_DIR"
    if [ ! -d "node_modules" ]; then
        print_status "Installing frontend dependencies..."
        npm install
        print_success "Frontend dependencies installed"
    fi
    
    # Step 6: Start frontend development server
    print_status "Starting frontend development server..."
    npm run dev > ../frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > "../$FRONTEND_PID_FILE"
    
    print_success "Frontend started (PID: $FRONTEND_PID)"
    
    # Wait for frontend to be ready
    sleep 5
    
    # Step 7: Display final information
    echo ""
    print_success "===== DAO Deployer Local Development Ready! ====="
    echo ""
    print_status "🚀 Services running:"
    print_status "  • Anvil Blockchain: http://$ANVIL_HOST:$ANVIL_PORT"
    print_status "  • Frontend App: http://localhost:$FRONTEND_PORT"
    echo ""
    print_status "📱 Default Anvil Accounts (use these in MetaMask):"
    print_status "  • Account 0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
    print_status "  • Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
    echo ""
    print_status "📝 Logs:"
    print_status "  • Anvil: tail -f anvil.log"
    print_status "  • Frontend: tail -f frontend.log"
    echo ""
    print_status "🛑 Press Ctrl+C to stop all services"
    echo ""
    
    # Keep script running and monitor processes
    while true; do
        # Check if Anvil is still running
        if ! ps -p $ANVIL_PID > /dev/null 2>&1; then
            print_error "Anvil process has stopped unexpectedly"
            exit 1
        fi
        
        # Check if Frontend is still running
        if ! ps -p $FRONTEND_PID > /dev/null 2>&1; then
            print_error "Frontend process has stopped unexpectedly"
            exit 1
        fi
        
        sleep 5
    done
}

# Run main function
main