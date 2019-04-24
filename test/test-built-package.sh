set -e

# Validate that this package can be installed and it contains some data

STARTING_DIR="$(pwd)"

npm pack
echo
echo '✅ Package built!'
echo

cd "$(mktemp -d)"
cp $STARTING_DIR/*.tgz .
npm init --yes
npm install *.tgz
echo '✅ Package installed!'
echo

node -e 'typeof require("mdn-short-descriptions").css.properties.background.__short_description == "string" || process.exit(1)'
echo '🏁 Package contained some data! 🏁'
echo
