FROM rust:1.80 AS builder
# creates a working directory inside the docker container. whenever we copy files from host machine it goes to /app in docker container
WORKDIR /dex_backend
# we can also write ./ instead of /dex_backend/ since (.) dot represent pwd 
COPY Cargo.toml Cargo.lock ./
COPY api_server/Cargo.toml ./api_server
COPY grpc_server/Cargo.toml ./grpc_server
COPY metrics_service/Cargo.toml ./metrics_service
COPY metrics_worker/Cargo.toml ./metrics_worker
COPY ohlcv_worker/Cargo.toml ./ohlcv_worker
COPY shared/Cargo.toml ./shared
COPY txn_worker/Cargo.toml ./txn_worker
# once we have the crates in pwd then we need to fetch them from cargo registry to execute the code
RUN cargo fetch
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