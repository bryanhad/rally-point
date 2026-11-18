package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"testing/fstest"
)

var testFrontend = fstest.MapFS{
	"index.html":    {Data: []byte("<html>app</html>")},
	"assets/app.js": {Data: []byte("console.log(1)")},
}

func get(t *testing.T, path string) *httptest.ResponseRecorder {
	t.Helper()
	rec := httptest.NewRecorder()
	newHandler(testFrontend).ServeHTTP(rec, httptest.NewRequest(http.MethodGet, path, nil))
	return rec
}

func TestVersion(t *testing.T) {
	version = "1.2.3-3-gabc1234"
	rec := get(t, "/api/version")
	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d", rec.Code)
	}
	if ct := rec.Header().Get("Content-Type"); ct != "application/json" {
		t.Errorf("content type = %q", ct)
	}
	var got map[string]string
	if err := json.Unmarshal(rec.Body.Bytes(), &got); err != nil {
		t.Fatal(err)
	}
	if got["version"] != "1.2.3-3-gabc1234" || len(got) != 1 {
		t.Errorf("body = %v", got)
	}
}

func TestUnknownAPIPathIs404(t *testing.T) {
	if rec := get(t, "/api/nope"); rec.Code != http.StatusNotFound {
		t.Errorf("status = %d, want 404", rec.Code)
	}
}

func TestVersionRejectsPost(t *testing.T) {
	rec := httptest.NewRecorder()
	newHandler(testFrontend).ServeHTTP(rec, httptest.NewRequest(http.MethodPost, "/api/version", nil))
	if rec.Code != http.StatusMethodNotAllowed {
		t.Errorf("status = %d, want 405", rec.Code)
	}
}

func TestFrontend(t *testing.T) {
	if rec := get(t, "/sports/badminton"); rec.Code != 200 || rec.Body.String() != "<html>app</html>" {
		t.Errorf("deep link: %d %q", rec.Code, rec.Body.String())
	}
	rec := get(t, "/assets/app.js")
	if rec.Code != 200 || rec.Header().Get("Cache-Control") != "public, max-age=31536000, immutable" {
		t.Errorf("asset: %d %q", rec.Code, rec.Header().Get("Cache-Control"))
	}
	if rec := get(t, "/assets/missing.js"); rec.Code != http.StatusNotFound {
		t.Errorf("missing asset = %d, want 404", rec.Code)
	}
}
