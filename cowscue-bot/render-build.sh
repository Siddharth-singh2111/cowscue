#!/usr/bin/env bash
# exit on error
set -o errexit

npm install
# Store/install Puppeteer Cache
npx puppeteer browsers install chrome