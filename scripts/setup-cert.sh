#!/bin/bash
# Setup self-signed code signing certificate for Redix
# Run this once on each build machine before running npm run package:mac

KEYCHAIN_NAME="build.keychain"
KEYCHAIN_PASS="temp"
CERT_NAME="RedixDevCert"

# Create keychain if not exists
if ! security list-keychains | grep -q "$KEYCHAIN_NAME"; then
  security create-keychain -p "$KEYCHAIN_PASS" "$KEYCHAIN_NAME"
fi

security unlock-keychain -p "$KEYCHAIN_PASS" "$KEYCHAIN_NAME"
security list-keychains -s "$KEYCHAIN_NAME"
security default-keychain -s "$KEYCHAIN_NAME"

# Check if cert already exists
if ! security find-identity -v -p codesigning | grep -q "$CERT_NAME"; then
  openssl req -x509 -newkey rsa:2048 \
    -keyout /tmp/"$CERT_NAME"_key.pem \
    -out /tmp/"$CERT_NAME"_cert.pem \
    -days 36135 -nodes \
    -subj "/CN=$CERT_NAME" \
    -addext "keyUsage=digitalSignature" \
    -addext "extendedKeyUsage=codeSigning"

  openssl pkcs12 -export \
    -in /tmp/"$CERT_NAME"_cert.pem \
    -inkey /tmp/"$CERT_NAME"_key.pem \
    -out /tmp/"$CERT_NAME".p12 \
    -passout pass:"$KEYCHAIN_PASS" \
    -name "$CERT_NAME"

  security import /tmp/"$CERT_NAME".p12 \
    -k "$KEYCHAIN_NAME" -P "$KEYCHAIN_PASS" -T /usr/bin/codesign

  security add-trusted-cert -d -r trustRoot \
    -k "$KEYCHAIN_NAME" /tmp/"$CERT_NAME"_cert.pem
fi

security set-key-partition-list \
  -S apple-tool:,apple:,codesign: \
  -s -k "$KEYCHAIN_PASS" "$KEYCHAIN_NAME"

# Restore login keychain as default
security default-keychain -s login.keychain-db

echo "Certificate '$CERT_NAME' is ready."
echo "To package: npm run build && electron-builder --mac --arm64"
