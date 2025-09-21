# File: packages/backend/Dockerfile
FROM rust:1.82-slim-bookworm AS builder
WORKDIR /app
# Install pkg-config and libssl-dev for openssl-sys
RUN apt-get update && apt-get install -y pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*
RUN rustup update stable
COPY packages/shared ./shared
COPY packages/backend/Cargo.toml packages/backend/Cargo.lock ./
COPY packages/backend/src ./src
RUN cargo build --release

FROM rust:1.71.1-slim-bookworm
WORKDIR /usr/local/bin
RUN apt-get update && apt-get install -y python3 python3-pip && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/target/release/rust-backend .
COPY --from=builder /app/shared ./shared
COPY packages/frontend/xaospy ./xaospy
EXPOSE 3001
CMD ["./rust-backend"]
