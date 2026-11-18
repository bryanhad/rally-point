// Command server serves the Rally Point frontend.
package main

import (
	"context"
	"encoding/json"
	"errors"
	"io/fs"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path"
	"strings"
	"syscall"
	"time"

	"github.com/klauspost/compress/gzhttp"

	"rally-point/web"
)

// Set at build time (see scripts/version.sh and the Dockerfile):
//
//	go build -ldflags "-X main.version=1.0.0"
//
// A plain `go run` or `go build` keeps this default.
var version = "dev"

func main() {
	dist, err := web.Dist()
	if err != nil {
		log.Fatal(err)
	}

	addr := ":" + getenv("PORT", "8080")
	srv := &http.Server{
		Addr:              addr,
		Handler:           gzhttp.GzipHandler(newHandler(dist)),
		ReadHeaderTimeout: 10 * time.Second,
	}

	// Stop cleanly when Docker sends SIGTERM (or on Ctrl+C locally).
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	go func() {
		log.Printf("listening on %s", addr)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatal(err)
		}
	}()

	<-ctx.Done()
	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Printf("shutdown: %v", err)
	}
}

// newHandler routes /api/* to the backend and everything else to the frontend.
func newHandler(frontend fs.FS) http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/api/version", versionHandler)
	// An unknown API path is a real 404, not the frontend's index.html.
	mux.Handle("/api/", http.NotFoundHandler())
	mux.Handle("/", spaHandler(frontend))
	return mux
}

func versionHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet && r.Method != http.MethodHead {
		w.Header().Set("Allow", "GET, HEAD")
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Cache-Control", "no-store")
	json.NewEncoder(w).Encode(map[string]string{"version": version})
}

// spaHandler serves files from fsys. A path that is not a file (an app route
// such as /sports/badminton) gets index.html so the client-side router can
// handle it. A missing file under /assets/ is a real 404, because answering
// with HTML would hide a stale build.
func spaHandler(fsys fs.FS) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet && r.Method != http.MethodHead {
			w.Header().Set("Allow", "GET, HEAD")
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}

		name := strings.TrimPrefix(path.Clean("/"+r.URL.Path), "/")
		if name == "" {
			name = "index.html"
		}

		info, err := fs.Stat(fsys, name)
		isFile := err == nil && !info.IsDir()

		switch {
		case isFile && strings.HasPrefix(name, "assets/"):
			// Built assets have content hashes in their names, so they never change.
			w.Header().Set("Cache-Control", "public, max-age=31536000, immutable")
		case !isFile && strings.HasPrefix(name, "assets/"):
			http.NotFound(w, r)
			return
		default:
			// index.html and everything else is revalidated so updates show up at once.
			w.Header().Set("Cache-Control", "no-cache")
		}

		if !isFile {
			name = "index.html"
		}
		http.ServeFileFS(w, r, fsys, name)
	})
}

func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
