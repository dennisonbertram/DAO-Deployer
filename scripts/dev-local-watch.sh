#!/bin/bash

# Enhanced Local Development Setup with Hot Reloading
# Starts Anvil, deploys contracts, runs frontend, and watches for contract changes

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Configuration
ANVIL_PORT=8545
ANVIL_HOST="127.0.0.1"
FRONTEND_PORT=3000
CONTRACTS_DIR="./contracts"
FRONTEND_DIR="./frontend"
ANVIL_PID_FILE=".anvil.pid"
FRONTEND_PID_FILE=".frontend.pid"
WATCHER_PID_FILE=".watcher.pid"

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

print_watcher() {
    echo -e "${PURPLE}[WATCHER]${NC} $1"
}

# Function to cleanup processes on exit
cleanup() {
    print_status "Shutting down enhanced local development environment..."
    
    # Stop Contract Watcher
    if [ -f "$WATCHER_PID_FILE" ]; then
        WATCHER_PID=$(cat "$WATCHER_PID_FILE")
        if ps -p $WATCHER_PID > /dev/null 2>&1; then
            print_status "Stopping Contract Watcher (PID: $WATCHER_PID)"
            kill $WATCHER_PID
        fi
        rm -f "$WATCHER_PID_FILE"
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
    
    # Stop Anvil
    if [ -f "$ANVIL_PID_FILE" ]; then
        ANVIL_PID=$(cat "$ANVIL_PID_FILE")
        if ps -p $ANVIL_PID > /dev/null 2>&1; then
            print_status "Stopping Anvil (PID: $ANVIL_PID)"
            kill $ANVIL_PID
        fi
        rm -f "$ANVIL_PID_FILE"
    fi
    
    # Clean up any remaining processes
    pkill -f "anvil.*$ANVIL_PORT" || true
    pkill -f "next.*dev.*$FRONTEND_PORT" || true
    pkill -f "fswatch.*contracts" || true
    pkill -f "inotifywait.*contracts" || true
    
    print_success "Enhanced development environment shutdown complete"
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

# Function to start contract watcher
start_contract_watcher() {
    print_watcher "Starting contract hot-reload watcher..."
    
    # Check if file watcher is available
    if command_exists fswatch; then
        print_watcher "Using fswatch for file monitoring"
        WATCH_CMD="fswatch"
    elif command_exists inotifywait; then
        print_watcher "Using inotifywait for file monitoring"
        WATCH_CMD="inotifywait"
    else
        print_warning "No file watcher available. Contract hot-reload disabled."
        print_status "To enable hot-reload:"
        print_status "  macOS: brew install fswatch"
        print_status "  Linux: apt-get install inotify-tools"
        return
    fi
    
    # Start the watcher in background
    ./scripts/watch-contracts.sh > watcher.log 2>&1 &
    WATCHER_PID=$!
    echo $WATCHER_PID > "$WATCHER_PID_FILE"
    
    print_success "Contract watcher started (PID: $WATCHER_PID)"
    print_watcher "Contract changes will trigger automatic rebuild and redeploy"
}

# Main function
main() {
    print_status "Starting Enhanced DAO Deployer Local Development Environment"
    print_status "==========================================================="
    
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
    
    anvil --host $ANVIL_HOST --port $ANVIL_PORT --accounts 10 --balance 10000 > ../anvil.log 2>&1 &
    ANVIL_PID=$!
    echo $ANVIL_PID > "../$ANVIL_PID_FILE"
    
    print_success "Anvil started (PID: $ANVIL_PID)"
    
    # Wait for Anvil to be ready
    if ! wait_for_port $ANVIL_PORT; then
        print_error "Anvil failed to start on port $ANVIL_PORT"
        exit 1
    fi
    
    # Step 2: Build and deploy initial contracts
    print_status "Building smart contracts..."
    if ! npm run build; then
        print_error "Contract build failed"
        exit 1
    fi
    
    print_status "Deploying contracts to local blockchain..."
    if ! npm run deploy:local; then
        print_error "Contract deployment failed"
        exit 1
    fi
    
    # Copy contract addresses to frontend
    if [ -f "local-contracts.json" ]; then
        cp local-contracts.json "../frontend/public/"
        print_success "Contract addresses copied to frontend"
    else
        print_error "local-contracts.json not found"
        exit 1
    fi
    
    # Step 3: Setup and start frontend
    cd "../$FRONTEND_DIR"
    if [ ! -d "node_modules" ]; then
        print_status "Installing frontend dependencies..."
        npm install
    fi
    
    print_status "Starting frontend development server..."
    npm run dev > ../frontend.log 2>&1 &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > "../$FRONTEND_PID_FILE"
    
    print_success "Frontend started (PID: $FRONTEND_PID)"
    
    # Step 4: Start contract watcher for hot reloading
    cd ..
    start_contract_watcher
    
    # Wait for everything to be ready
    sleep 5
    
    # Display final information
    echo ""
    print_success "===== Enhanced DAO Deployer Development Ready! ====="
    echo ""
    print_status "🚀 Services running:"
    print_status "  • Anvil Blockchain: http://$ANVIL_HOST:$ANVIL_PORT"
    print_status "  • Frontend App: http://localhost:$FRONTEND_PORT"
    if [ -f "$WATCHER_PID_FILE" ]; then
        print_watcher "  • Contract Hot-Reload: Active"
    else
        print_warning "  • Contract Hot-Reload: Disabled (file watcher not available)"
    fi
    echo ""
    print_status "🔥 Hot-Reload Features:"
    print_status "  • Contract changes automatically trigger rebuild & redeploy"
    print_status "  • Frontend automatically picks up new contract addresses"
    print_status "  • No need to manually restart services"
    echo ""
    print_status "📱 Default Anvil Account (use in MetaMask):"
    print_status "  • Address: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
    print_status "  • Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
    echo ""
    print_status "📝 Logs:"
    print_status "  • Anvil: tail -f anvil.log"
    print_status "  • Frontend: tail -f frontend.log"
    print_status "  • Contract Watcher: tail -f watcher.log"
    echo ""
    print_status "🛑 Press Ctrl+C to stop all services"
    echo ""
    
    # Monitor all processes
    while true; do
        # Check Anvil
        if ! ps -p $ANVIL_PID > /dev/null 2>&1; then
            print_error "Anvil process stopped unexpectedly"
            exit 1
        fi
        
        # Check Frontend
        if ! ps -p $FRONTEND_PID > /dev/null 2>&1; then
            print_error "Frontend process stopped unexpectedly"
            exit 1
        fi
        
        # Check Contract Watcher (optional)
        if [ -f "$WATCHER_PID_FILE" ]; then
            WATCHER_PID=$(cat "$WATCHER_PID_FILE")
            if ! ps -p $WATCHER_PID > /dev/null 2>&1; then
                print_warning "Contract watcher stopped. Hot-reload disabled."
                rm -f "$WATCHER_PID_FILE"
            fi
        fi
        
        sleep 5
    done
}

# Run main function
main