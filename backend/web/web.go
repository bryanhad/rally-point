// Package web holds the built frontend, compiled into the binary.
package web

import (
	"embed"
	"io/fs"
)

// The "all:" prefix also includes files whose names start with "." or "_".
// dist/ is filled by the Dockerfile (or by copying frontend/dist here);
// only placeholder.txt is committed, so that this package always compiles.
//
//go:embed all:dist
var files embed.FS

// Dist returns the frontend files, rooted at the folder that holds index.html.
func Dist() (fs.FS, error) {
	return fs.Sub(files, "dist")
}
