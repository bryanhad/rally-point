#!/bin/sh
# Prints the backend version for the build, taken from git.
#
# Releases are git tags named backend/vMAJOR.MINOR.PATCH, e.g.:
#   git tag backend/v1.0.0 && git push origin backend/v1.0.0
#
# The output depends on where the build is relative to the latest such tag:
#   1.0.0                    exactly on the tag
#   1.0.0-3-gabc1234         3 commits after the tag (g = git, then the commit)
#   1.0.0-3-gabc1234-dirty   ... and with uncommitted changes to tracked files
#   dev-abc1234              no such tag exists yet (same -dirty rule)
#   dev                      git is not available
set -eu
cd "$(dirname "$0")/.."

if v=$(git describe --tags --match 'backend/v*' --dirty 2>/dev/null); then
	echo "${v#backend/v}"
elif c=$(git describe --always --dirty 2>/dev/null); then
	echo "dev-$c"
else
	echo dev
fi
