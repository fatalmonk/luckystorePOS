import csv

def parse_data():
    with open('data/inventory/prompt_data.tsv', 'r', encoding='utf-8') as f:
        # The data is tab-separated
        lines = f.readlines()
        for idx, line in enumerate(lines[:5]):
            parts = line.split('\t')
            print(f"Row {idx+1} has {len(parts)} columns:")
            for c_idx, part in enumerate(parts):
                print(f"  Col {c_idx}: '{part}'")
            print("-" * 20)

parse_data()
