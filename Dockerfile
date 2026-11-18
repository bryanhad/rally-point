# Build the frontend, embed it into the Go server, ship only the binary.
# Build context is the repository root (it needs both frontend/ and backend/).

# Stage 1: build the frontend into /app/dist.
FROM node:24-alpine AS frontend
WORKDIR /app
# Same pnpm version as local development.
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate
# Install dependencies first so this layer is cached until the lockfile changes.
COPY frontend/package.json frontend/pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY frontend/ .
# Visitor counting is only built in when this is set, e.g. https://stats.example.com/count
ARG VITE_GOATCOUNTER_URL=""
ENV VITE_GOATCOUNTER_URL=$VITE_GOATCOUNTER_URL
RUN pnpm build

# Stage 2: compile the Go server with the frontend embedded.
FROM golang:1.27-alpine AS backend
WORKDIR /src
# Download modules first so this layer is cached until go.mod/go.sum change.
COPY backend/go.mod backend/go.sum ./
RUN go mod download
COPY backend/ .
# Replace the committed placeholder with the real build, then compile.
RUN rm -rf web/dist
COPY --from=frontend /app/dist ./web/dist
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/server .

# Stage 3: just the binary.
FROM scratch
COPY --from=backend /out/server /server
ENV PORT=8080
EXPOSE 8080
ENTRYPOINT ["/server"]
