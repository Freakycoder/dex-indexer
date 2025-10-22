# DEX Screener - Real-time Solana DEX Analytics Platform

A high-performance, real-time DEX screener and analytics platform for Solana, tracking live transactions across Raydium, Meteora, and Orca with interactive charts and comprehensive market data.

## 🚀 Features

- **Real-time Transaction Tracking** - Monitor DEX swaps across multiple Solana DEXs
- **Interactive OHLCV Charts** - TradingView-style charts with multiple timeframes
- **Live Price Feeds** - Real-time USD and SOL price updates
- **Advanced Analytics** - Volume, liquidity, market cap, and trading metrics
- **Token Discovery** - Search and filter tokens with real-time data
- **WebSocket Updates** - Sub-second data delivery for live trading

## 🏗️ Architecture

### Backend (Rust)
- **API Server** - REST API and WebSocket endpoints
- **gRPC Server** - Yellowstone blockchain data ingestion
- **Workers** - Transaction processing, metrics calculation, OHLCV generation
- **Redis** - Caching, pub/sub messaging, and data streams

### Frontend (Next.js)
- **React Components** - Interactive token tables and charts
- **WebSocket Context** - Real-time data management
- **TypeScript** - Type-safe development

### Data Flow
```
Solana Blockchain → Yellowstone gRPC → Processing Workers → Redis → WebSocket → Frontend
```

## 🚀 Quick Start

### Prerequisites
- Rust 1.70+ with Cargo
- Node.js 18+ with npm
- Redis 7+
- Docker (optional)
- Yellowstone gRPC access

### 🐳 Docker Setup (Recommended)

1. **Clone and configure**
```bash
git clone https://github.com/your-username/dex-screener.git
cd dex-screener

# Configure environment
cp backend/.env.example backend/.env
# Edit backend/.env with your gRPC credentials
```

2. **Start backend services**
```bash
cd backend
docker-compose up -d
```

3. **Start frontend**
```bash
cd ../src  # Navigate to frontend directory
npm install
npm run dev
```

4. **Access application**
- Frontend: http://localhost:3000
- API Health: http://localhost:8080/api/health
- WebSocket: ws://localhost:8080/ws

### 🔧 Manual Setup

1. **Backend setup**
```bash
cd backend
cargo build --release

# Start Redis
redis-server &

# Start all services
./start.sh
```

2. **Frontend setup**
```bash
cd src
npm install
npm run dev
```

## 📡 API Overview

### REST Endpoints
- `GET /api/health` - Service health check
- `GET /api/` - API information

### WebSocket Messages
- **Transaction Updates** - Real-time swap data
- **Price Updates** - Current token prices
- **Metrics Updates** - Trading statistics
- **OHLCV Candles** - Chart data

Example transaction message:
```json
{
  "date": "2024-01-15T10:30:45Z",
  "purchase_type": "Buy",
  "usd_value": 1250.75,
  "token_quantity": 2500000,
  "token_price": 0.0005003,
  "token_pair": "BONK/SOL",
  "dex_type": "Raydium",
  "dex_tag": "CLMM"
}
```

## 🛠️ Development

### Backend Structure
```
backend/
├── api_server/          # REST API & WebSocket
├── grpc_server/         # Blockchain data ingestion
├── txn_worker/          # Transaction processing
├── metrics_worker/      # Metrics calculation
├── ohlcv_worker/        # Chart data generation
├── metrics_service/     # Periodic updates
└── shared/              # Common libraries
```

### Frontend Structure
```
src/
├── components/
│   ├── charts/          # TradingView charts
│   ├── tokens/          # Token tables & details
│   └── layout/          # UI layout
├── context/             # WebSocket management
├── hooks/               # Custom React hooks
└── pages/               # Next.js pages
```

### Environment Variables

**Backend (.env)**
```bash
REDIS_URL=redis://localhost:6379
GRPC_URL=your_yellowstone_endpoint
GRPC_TOKEN=your_grpc_token
HELIUS_URL=your_helius_rpc
```

**Frontend (.env.local)**
```bash
NEXT_PUBLIC_WS_URL=ws://localhost:8080/ws
NEXT_PUBLIC_API_URL=http://localhost:8080/api
```

## 🚀 Production Deployment

### Docker Production
```bash
# Build backend
cd backend
docker build -t dex-screener-backend .

# Run with docker-compose
docker-compose -f docker-compose.prod.yml up -d
```

### Scaling Considerations
- Use Redis Cluster for high throughput
- Run multiple worker instances
- Implement load balancing with nginx
- Monitor memory and CPU usage

## 🧪 Testing

**Backend**
```bash
cd backend
cargo test                    # Unit tests
cargo test --integration     # Integration tests
```

**Frontend**
```bash
cd src
npm test                     # Jest tests
npm run test:e2e            # E2E tests
```

## 📊 Monitoring

### Health Checks
```bash
curl http://localhost:8080/api/health
redis-cli ping
docker-compose logs -f backend
```

### Key Metrics
- Transaction processing rate
- WebSocket connections
- Redis memory usage
- API response times

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push branch: `git push origin feature/amazing-feature`
5. Open pull request

### Development Guidelines
- Follow Rust formatting with `rustfmt`
- Use TypeScript strict mode
- Add tests for new features
- Update documentation

## 📝 License

This project is licensed under the MIT License - see [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

- **Solana Labs** - Blockchain infrastructure
- **Yellowstone gRPC** - Real-time data feeds
- **Redis** - High-performance caching
- **TradingView** - Charting inspiration

---

**Built with ❤️ for the Solana DeFi ecosystem**
