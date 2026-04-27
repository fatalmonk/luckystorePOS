import openpyxl

def convert_tsv_to_xlsx():
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Imported Items"

    with open('data/inventory/prompt_data.tsv', 'r', encoding='utf-8') as f:
        for idx, line in enumerate(f):
            if not line.strip(): continue
            parts = line.split('\t')
            # Clean up newlines from the last element if any
            if parts:
                parts[-1] = parts[-1].rstrip('\n')
            
            # Try to convert numeric values to floats/ints for better Excel handling
            row_data = []
            for part in parts:
                try:
                    # if it looks like an int
                    if part.isdigit():
                        row_data.append(int(part))
                    else:
                        # try float
                        val = float(part)
                        row_data.append(val)
                except ValueError:
                    row_data.append(part)
                    
            ws.append(row_data)

    output_path = 'data/inventory/Import_Items_Processed.xlsx'
    wb.save(output_path)
    print(f"Saved to {output_path}")

if __name__ == '__main__':
    convert_tsv_to_xlsx()
