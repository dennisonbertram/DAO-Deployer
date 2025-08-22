#!/bin/bash

# Contract Watcher Script for Hot Reloading
# Watches for changes in contract files and automatically redeploys

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
CONTRACTS_DIR="./contracts"
WATCH_PATHS="$CONTRACTS_DIR/src $CONTRACTS_DIR/test $CONTRACTS_DIR/script"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[WATCHER]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[WATCHER]${NC} $1"
}

print_error() {
    echo -e "${RED}[WATCHER]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to rebuild and redeploy contracts
rebuild_and_redeploy() {
    local changed_file="$1"
    
    print_status "File changed: $changed_file"
    print_status "Rebuilding and redeploying contracts..."
    
    cd "$CONTRACTS_DIR"
    
    # Build contracts
    if npm run build; then
        print_success "Build successful"
        
        # Deploy to local Anvil
        if npm run deploy:local; then
            print_success "Deployment successful"
            
            # Copy updated addresses to frontend
            if [ -f "local-contracts.json" ]; then
                cp local-contracts.json "../frontend/public/"
                print_success "Contract addresses updated in frontend"
            fi
            
            print_success "🚀 Contracts hot-reloaded successfully!"
        else
            print_error "Deployment failed"
        fi
    else
        print_error "Build failed"
    fi
    
    cd ..
}

# Main function
main() {
    print_status "Starting contract hot-reload watcher..."
    print_status "Watching: $WATCH_PATHS"
    
    # Check if fswatch is available (macOS)
    if command_exists fswatch; then
        print_status "Using fswatch for file monitoring"
        fswatch -o $WATCH_PATHS | while read; do
            rebuild_and_redeploy "detected by fswatch"
        done
    # Check if inotifywait is available (Linux)
    elif command_exists inotifywait; then
        print_status "Using inotifywait for file monitoring"
        inotifywait -m -r -e modify,create,delete $WATCH_PATHS --format '%w%f' | while read file; do
            # Only trigger on .sol files
            if [[ "$file" == *.sol ]]; then
                rebuild_and_redeploy "$file"
            fi
        done
    else
        print_error "No file watcher available. Please install fswatch (macOS) or inotify-tools (Linux)"
        print_status "macOS: brew install fswatch"
        print_status "Linux: apt-get install inotify-tools"
        exit 1
    fi
}

# Handle graceful shutdown
trap 'print_status "Shutting down contract watcher..."; exit 0' SIGINT SIGTERM

# Run main function
main