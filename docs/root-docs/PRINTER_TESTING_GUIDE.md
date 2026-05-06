# MHT-P29L Printer Testing Guide

## Quick Test

### Step 1: Physical Setup
1. **Turn ON** the MHT-P29L printer
2. **Load label roll** (40mm x 30mm recommended)
3. **Press and hold** power button until **blue light flashes**
4. Printer is now in **PAIRING MODE**

### Step 2: App Testing
1. Open the Lucky Store app
2. Look for **test icon** (🐛) in the top-right of home screen
3. Tap **"Test Printer"**

### Step 3: Connect
1. Tap **"Scan"** button
2. Wait for **"MHT-P29L"** to appear
3. Note the device ID
4. Tap test buttons below

### Step 4: Test Prints

#### Test 1: Simple Label
- Tap **"Test Simple"**
- Expected output:
```
┌───────────────────────┐
│ Test Product          │
│                       │
│ ৳99.99                │
│                       │
│ ████████████████      │ ← Barcode
│                       │
│ TEST123456            │
└───────────────────────┘
```

#### Test 2: Label with MRP
- Tap **"Test with MRP"**
- Expected output:
```
┌───────────────────────┐
│ MRP Test Product      │
│                       │
│ ~~MRP: ৳450.00~~      │ ← Strikethrough
│ ───────────           │ ← Line through
│ Our Price:            │
│ ৳350.00      (-22%)   │ ← Discount shown
│                       │
│ ████████████████      │ ← Barcode
│                       │
│ TEST-MRP-001          │
└───────────────────────┘
```

#### Test 3: Bulk Print
- Tap **"Test Bulk (3x)"**
- Should print 3 labels in sequence
- Check for proper spacing between prints

## Test Screen Features

### Event Logs
The test screen shows real-time logs:
- **Scan results** - Lists discovered printers
- **Connection status** - Shows connect/disconnect events
- **Print results** - Success/failure messages
- **Timestamps** - For debugging timing issues

### Buttons Explained

| Button | Action | Expected Result |
|--------|--------|----------------|
| **Scan** | Scan for Bluetooth devices | Shows "MHT-P29L" in logs |
| **Test Simple** | Print basic label | Label with product name, price, barcode |
| **Test with MRP** | Print with MRP strikethrough | Shows crossed-out MRP + discount |
| **Test Bulk (3x)** | Print 3 labels | Three labels in sequence |

## Testing Checklist

### Connection Tests
- [ ] Printer appears in scan results
- [ ] Can connect to printer
- [ ] Connection status shows "Connected"
- [ ] Device ID is displayed

### Print Tests
- [ ] Simple label prints correctly
- [ ] Text is readable (not garbled)
- [ ] Barcode is scannable
- [ ] Price is displayed correctly
- [ ] Label peels off cleanly

### MRP Tests
- [ ] MRP text has strikethrough
- [ ] Strikethrough line is visible
- [ ] Sale price is prominent
- [ ] Discount % is calculated correctly
- [ ] "Our Price" label appears

### Bulk Tests
- [ ] Multiple labels print in sequence
- [ ] No overlap between labels
- [ ] Each label has correct data
- [ ] No printer buffer errors

## Common Issues & Fixes

### Issue: Printer not found
**Symptoms:** Scan shows no results

**Solutions:**
1. Check blue light is **flashing** (not solid)
2. Move phone **closer** to printer (within 1 meter)
3. Ensure **Bluetooth is ON** on phone
4. Try **restarting** the printer
5. Check printer is **not connected** to another device

### Issue: Connection failed
**Symptoms:** "Connection failed" error

**Solutions:**
1. Printer may already be connected - **disconnect first**
2. Move closer to printer
3. Restart printer and try again
4. Check printer battery level

### Issue: Print failed
**Symptoms:** "Print failed" in logs

**Solutions:**
1. Verify printer is **still connected**
2. Check **label roll** is loaded
3. Ensure printer **lid is closed**
4. Check printer **battery** (should be >20%)
5. Try **slower print speed** (adjust in code)

### Issue: Garbled text
**Symptoms:** Weird characters or unreadable text

**Solutions:**
1. Check **label size** is 40x30mm
2. Verify **printer density** setting
3. Clean **print head** with alcohol wipe
4. Try different **label roll**

### Issue: Barcode not scanning
**Symptoms:** Scanner can't read barcode

**Solutions:**
1. Check barcode is **not smudged**
2. Ensure **printer density** is high enough (8-10)
3. Verify **label is clean**
4. Try scanning with different scanner
5. Check barcode format is **Code128**

### Issue: Strikethrough not visible
**Symptoms:** MRP text not crossed out

**Solutions:**
1. Increase **printer density** for better black
2. Check **label quality**
3. Verify TSPL commands include `BAR` command
4. Clean print head

## Debug Information

### Check Connection Status
Look in event logs for:
- `Event: scanning - Scanning for printers...`
- `Event: connected - Printer connected successfully`
- `Event: printed - Label printed successfully`

### Check Error Messages
Common errors in logs:
- `Connection failed` - Bluetooth issue
- `Print failed` - Printer not responding
- `No printer connected` - Connection dropped

### Export Logs
Tap **"Clear logs"** button (X icon) to clear,
or screenshot the logs to share for debugging.

## Test Data

### Sample Barcodes to Test
- `TEST001` - Simple alphanumeric
- `8901234567890` - Numeric (EAN format)
- `PROD-123-ABC` - With hyphens
- `SKU20240506` - Date format

### Sample Product Names
- `Rice Premium 5kg` - Normal name
- `Cooking Oil 1L` - With space
- `Tea-500g` - With hyphen
- `मसाला चाय` - Bengali text (UTF-8)

### Price Formats
- `350.00` - Standard
- `99.99` - With decimals
- `1000` - No decimals
- `45.50` - With cents

## Performance Testing

### Speed Test
1. Tap **"Test Bulk (3x)"**
2. Time how long 3 labels take
3. Should complete within 10 seconds

### Stress Test
1. Go to **Bulk Label Print**
2. Import 50+ products from CSV
3. Print all at once
4. Monitor for errors

### Battery Test
1. Check printer battery level
2. Print 20 labels
3. Check battery again
4. Should use ~10-15% battery

## Success Criteria

✅ **Basic Functionality:**
- Printer connects reliably
- Single label prints correctly
- Text is readable
- Barcode scans

✅ **MRP Feature:**
- MRP shown with strikethrough
- Discount % calculated
- "Our Price" label visible

✅ **Bulk Printing:**
- Multiple labels print
- No errors in sequence
- All labels correct

✅ **Error Handling:**
- Clear error messages
- Graceful failures
- Recovery possible

## Next Steps After Testing

Once testing passes:
1. Remove test icon from home screen (optional)
2. Train staff on printer usage
3. Create label printing SOP
4. Set up regular maintenance schedule
5. Order label rolls in bulk

## Support

If tests fail:
1. Screenshot the event logs
2. Note printer model and firmware version
3. Check MHT-P29L manual
4. Contact printer supplier if hardware issue

## Files for Testing

- `lib/core/services/printer/printer_test_screen.dart` - Test UI
- `TEST_PRINTER.sh` - Bash test script (reference)
- This guide
