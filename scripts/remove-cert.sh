#!/bin/bash
# Remove self-signed code signing certificate for Redix

CERT_NAME="RedixDevCert"
KEYCHAIN_NAME="build.keychain"

security delete-identity -c "$CERT_NAME" "$KEYCHAIN_NAME" 2>/dev/null && \
  echo "Certificate '$CERT_NAME' removed." || \
  echo "Certificate '$CERT_NAME' not found."
