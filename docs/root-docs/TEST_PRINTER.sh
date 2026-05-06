#!/bin/bash

echo "=========================================="
echo "MHT-P29L Printer Test Guide"
echo "=========================================="
echo ""
echo "Follow these steps to test your printer:"
echo ""
echo "Step 1: Physical Setup"
echo "----------------------"
echo "1. Turn ON the MHT-P29L printer"
echo "2. Load label roll (40mm x 30mm recommended)"
echo "3. Press and hold power button until blue light flashes"
echo "4. Printer is now in PAIRING MODE"
echo ""
echo "Step 2: Run the App Test"
echo "------------------------"
echo "1. Open the Lucky Store app"
echo "2. Navigate to: Home → Print Icon (🖨️)"
echo "3. Or: Inventory → Label Printer"
echo ""
echo "Step 3: Connect Printer"
echo "----------------------"
echo "1. Tap 'Scan for Printers'"
echo "2. Wait for 'MHT-P29L' to appear"
echo "3. Tap 'Connect'"
echo "4. Status should show: 'Connected to MHT-P29L'"
echo ""
echo "Step 4: Print Test Label"
echo "-----------------------"
echo "1. Enter test data:"
echo "   - Barcode: TEST001"
echo "   - Product Name: Test Product"
echo "   - Price: 99.99"
echo "   - MRP: 150.00 (optional)"
echo "   - Copies: 1"
echo "2. Tap 'Print Label'"
echo "3. Wait for printer to output label"
echo ""
echo "Expected Label Output:"
echo "-------------------"
cat << 'EOF'
┌────────────────────────────┐
│ Test Product               │
│                            │
│ MRP: ~~৳150.00~~          │  ← Strikethrough
│ ───────────                │  ← Line through
│ Our Price:                 │
│ ৳99.99           (-33%)    │  ← Sale price
│                            │
│ ████████████████           │  ← Barcode (scannable)
│                            │
│ TEST001                    │
└────────────────────────────┘
EOF
echo ""
echo "Step 5: Test Bulk Print"
echo "----------------------"
echo "1. Go to: Bulk Label Print screen"
echo "2. Tap menu (⋮) → 'Download Template'"
echo "3. Import the template CSV"
echo "4. Select products and print"
echo ""
echo "Troubleshooting:"
echo "---------------"
echo "• Printer not found: Ensure blue light is flashing"
echo "• Connection failed: Move closer to printer"
echo "• Print failed: Check label roll and printer battery"
echo "• Garbled text: Check label size (should be 40x30mm)"
echo ""
echo "=========================================="
