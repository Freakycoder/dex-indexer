FROM rust:latest AS builder
# creates a working directory inside the docker container. whenever we copy files from host machine it goes to /app in docker container
WORKDIR /dex_backend

ARG REDIS_URL

ENV REDIS_URL=${REDIS_URL}

# we can also write ./ instead of /dex_backend/ since (.) dot represent pwd 
COPY Cargo.toml Cargo.lock ./
COPY api_server/Cargo.toml ./api_server/
COPY grpc_server/Cargo.toml ./grpc_server/
COPY metrics_service/Cargo.toml ./metrics_service/
COPY metrics_worker/Cargo.toml ./metrics_worker/
COPY ohlcv_worker/Cargo.toml ./ohlcv_worker/
COPY shared/Cargo.toml ./shared/
COPY txn_worker/Cargo.toml ./txn_worker/

RUN mkdir -p api_server/src && \
    mkdir -p grpc_server/src && \
    mkdir -p metrics_service/src && \
    mkdir -p metrics_worker/src && \
    mkdir -p ohlcv_worker/src && \
    mkdir -p txn_worker/src && \
    mkdir -p shared/src && \
    echo "fn main() {}" > api_server/src/main.rs && \
    echo "fn main() {}" > grpc_server/src/main.rs && \
    echo "fn main() {}" > metrics_service/src/main.rs && \
    echo "fn main() {}" > metrics_worker/src/main.rs && \
    echo "fn main() {}" > ohlcv_worker/src/main.rs && \
    echo "fn main() {}" > txn_worker/src/main.rs && \
    echo "pub fn dummy() {}" > shared/src/lib.rs

# once we have the crates in pwd then we need to fetch them from cargo registry to execute the code
RUN cargo build --release
# now copy the source code ignoring the files present in .dockerignore from local host to docker
COPY . .
# after copying the src now build it. cargo looks at backend/Cargo.toml and find workspace mods, and then build them individually
RUN cargo build --release

FROM debian:bookworm-slim AS runtime

WORKDIR /dex_backend_runtime

COPY --from=builder /dex_backend/target/release/api_server ./api_server
COPY --from=builder /dex_backend/target/release/grpc_server ./grpc_server
COPY --from=builder /dex_backend/target/release/metrics_service ./metrics_service
COPY --from=builder /dex_backend/target/release/metrics_worker ./metrics_worker
COPY --from=builder /dex_backend/target/release/ohlcv_worker ./ohlcv_worker
COPY --from=builder /dex_backend/target/release/txn_worker ./txn_worker
# chmod changes the permission (mode) of file to +x (executables) for all files (./*) 
RUN chmod +x ./*
# cmd is the command that runs when u start the image. sleep infinity is a dummy command that keeps the container alive but does nothing
CMD ["sleep", "infinity"]