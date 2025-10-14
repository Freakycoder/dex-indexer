#!/bin/bash
set -e

echo "🚀 Starting DEX Backend Services..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Verify environment
echo "Checking environment variables..."
if [ -z "$REDIS_URL" ]; then
    echo "❌ ERROR: REDIS_URL not set"
    exit 1
fi

if [ -z "$GRPC_URL" ]; then
    echo "❌ ERROR: GRPC_URL not set"
    exit 1
fi

echo "✅ Environment variables OK"
echo "Redis: $REDIS_URL"
echo "gRPC: ${GRPC_URL:0:30}..."  # Show first 30 chars only
echo ""

# Create log directory
mkdir -p /tmp/logs

# Start services with output redirection
echo "Starting API Server..."
./api_server > /tmp/logs/api_server.log 2>&1 &
API_PID=$!
sleep 2

# Check if it's still running
if ! kill -0 $API_PID 2>/dev/null; then
    echo "❌ API Server failed to start!"
    echo "Logs:"
    cat /tmp/logs/api_server.log
    exit 1
fi
echo "✅ API Server started (PID: $API_PID)"

echo "Starting gRPC Server..."
./grpc_server > /tmp/logs/grpc_server.log 2>&1 &
GRPC_PID=$!
sleep 2

if ! kill -0 $GRPC_PID 2>/dev/null; then
    echo "❌ gRPC Server failed to start!"
    echo "Logs:"
    cat /tmp/logs/grpc_server.log
    exit 1
fi
echo "✅ gRPC Server started (PID: $GRPC_PID)"

echo "Starting Transaction Worker..."
./txn_worker > /tmp/logs/txn_worker.log 2>&1 &
TXN_PID=$!
sleep 1

if ! kill -0 $TXN_PID 2>/dev/null; then
    echo "❌ Transaction Worker failed to start!"
    echo "Logs:"
    cat /tmp/logs/txn_worker.log
    exit 1
fi
echo "✅ Transaction Worker started (PID: $TXN_PID)"

echo "Starting Metrics Worker..."
./metrics_worker > /tmp/logs/metrics_worker.log 2>&1 &
METRICS_PID=$!
sleep 1

if ! kill -0 $METRICS_PID 2>/dev/null; then
    echo "❌ Metrics Worker failed to start!"
    echo "Logs:"
    cat /tmp/logs/metrics_worker.log
    exit 1
fi
echo "✅ Metrics Worker started (PID: $METRICS_PID)"

echo "Starting OHLCV Worker..."
./ohlcv_worker > /tmp/logs/ohlcv_worker.log 2>&1 &
OHLCV_PID=$!
sleep 1

if ! kill -0 $OHLCV_PID 2>/dev/null; then
    echo "❌ OHLCV Worker failed to start!"
    echo "Logs:"
    cat /tmp/logs/ohlcv_worker.log
    exit 1
fi
echo "✅ OHLCV Worker started (PID: $OHLCV_PID)"

echo "Starting Metrics Service..."
./metrics_service > /tmp/logs/metrics_service.log 2>&1 &
SERVICE_PID=$!
sleep 1

if ! kill -0 $SERVICE_PID 2>/dev/null; then
    echo "❌ Metrics Service failed to start!"
    echo "Logs:"
    cat /tmp/logs/metrics_service.log
    exit 1
fi
echo "✅ Metrics Service started (PID: $SERVICE_PID)"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ ALL SERVICES RUNNING SUCCESSFULLY"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Process IDs:"
echo "   API Server: $API_PID"
echo "   gRPC Server: $GRPC_PID"
echo "   Txn Worker: $TXN_PID"
echo "   Metrics Worker: $METRICS_PID"
echo "   OHLCV Worker: $OHLCV_PID"
echo "   Metrics Service: $SERVICE_PID"
echo ""
echo "🌐 Listening on http://0.0.0.0:8080"
echo "💚 Health check: http://localhost:8080/api/health"
echo ""
echo "📝 Logs available at:"
echo "   /tmp/logs/api_server.log"
echo "   /tmp/logs/grpc_server.log"
echo "   /tmp/logs/txn_worker.log"
echo "   /tmp/logs/metrics_worker.log"
echo "   /tmp/logs/ohlcv_worker.log"
echo "   /tmp/logs/metrics_service.log"
echo ""
echo "⏳ Monitoring services... (Ctrl+C to stop)"
echo ""

# Monitor processes and restart if they die
while true; do
    for pid in $API_PID $GRPC_PID $TXN_PID $METRICS_PID $OHLCV_PID $SERVICE_PID; do
        if ! kill -0 $pid 2>/dev/null; then
            echo "❌ ERROR: Process $pid died!"
            echo "Check logs in /tmp/logs/"
            exit 1
        fi
    done
    sleep 5
done