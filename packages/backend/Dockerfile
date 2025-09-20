
# File: packages/backend/Dockerfile

# Stage 1: Build Rust binary
FROM rust:1.82-slim-bookworm AS builder
WORKDIR /app

# Update Cargo
RUN rustup update stable

# Copy shared directory for build
COPY packages/shared ./shared

# Copy backend code
COPY packages/backend/Cargo.toml packages/backend/Cargo.lock ./
COPY packages/backend/src ./src

# Build release binary
RUN cargo build --release

# Stage 2: Production
FROM rust:1.71.1-slim-bookworm

WORKDIR /usr/local/bin

# Install Python
RUN apt-get update && apt-get install -y python3 python3-pip && rm -rf /var/lib/apt/lists/*

# Copy Rust binary
COPY --from=builder /app/target/release/rust-backend .

# Copy shared directory
COPY --from=builder /app/shared ./shared

# Copy Python scripts
COPY packages/xaospy ./xaospy

# Expose API port
EXPOSE 3001

# Run Rust backend
CMD ["./rust-backend"]
