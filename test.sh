#!/bin/bash

set -e

# test.sh - Test runner for document-diff feature implementation
# Usage:
#   ./test.sh base  - Run base repository tests
#   ./test.sh new   - Run new document-diff feature tests

COMMAND=$1

if [ -z "$COMMAND" ]; then
  echo "Usage: ./test.sh [base|new]"
  echo "  base - Run base repository tests"
  echo "  new  - Run new document-diff feature tests"
  exit 1
fi

case "$COMMAND" in
  base)
    echo "Running base repository tests..."
    echo "========================================"
    pnpm test --filter='@remirror/extension-count' --coverage=false
    ;;
    
  new)
    echo "Running new document-diff feature tests..."
    echo "========================================"
    pnpm test --filter='@remirror/extension-document-diff' --coverage=false
    ;;
    
  *)
    echo "Error: Unknown command '$COMMAND'"
    echo "Usage: ./test.sh [base|new]"
    exit 1
    ;;
esac

echo ""
echo "✓ Tests completed successfully"
