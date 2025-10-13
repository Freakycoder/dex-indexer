#!/bin/bash
set -e

echo "🚀 Starting DEX Backend Services..."

# Start all services in background
./api_server &
./grpc_server &
./txn_worker &
./metrics_worker &
./ohlcv_worker &
./metrics_service &

echo "✅ All services started!"
echo "Listening on port 8080..."

# Wait for any process to exit
wait -n
exit $?