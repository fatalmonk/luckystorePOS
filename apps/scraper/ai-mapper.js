import fs from 'fs';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

// 1. Read your ACTUAL Lucky Store Products from the CSV
const INVENTORY_PATH = '/Users/mac.alvi/Desktop/Projects/Lucky Store/data/inventory/LS InventoryApr10th.csv';
const myLuckyStoreProducts = [];

try {
  const csvData = fs.readFileSync(INVENTORY_PATH, 'utf-8');
  const lines = csvData.split('\n');
  
  // Skip the header row (0) and read the first 15 valid products
  for (let i = 1; i < lines.length; i++) {
    const columns = lines[i].split(',');
    
    // Check if it's a real product row (has Item Name in col index 3)
    // CSV format: Sl, SKU, Barcode, Item Name, Category, etc.
    const itemName = columns[3];
    if (itemName && itemName.trim() !== '' && myLuckyStoreProducts.length < 15) {
      myLuckyStoreProducts.push({
        id: columns[0], // Sl
        name: itemName.trim(),
        category: columns[4] ? columns[4].trim() : ''
      });
    }
  }
} catch (error) {
  console.error("Could not read your LS Inventory CSV file. Using fallback data.", error.message);
}

// 2. The scraped Shwapno products (Normally we read this from the Excel file we just generated!)
const scrapedShwapnoProducts = [

  { name: "Ariel Washing Powder - 1 kg", price: 290 },
  { name: "Pepsodent Tooth Paste Advanced Salt 70g", price: 90 },
  { name: "Radhuni Masala Beef 100 gm", price: 65 },
  { name: "Nescafe Classic Coffee 50g", price: 120 } // Unrelated item to test AI
];

async function matchProductsWithAI() {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    console.error("❌ ERROR: Please set GEMINI_API_KEY in your environment (e.g., export GEMINI_API_KEY=your-key-here)");
    return;
  }

  console.log("Asking AI to map our products with competitor products. Please wait...\n");

  const prompt = `
  You are an expert e-commerce data mapper for a retail store in Bangladesh.
  I will give you a list of MY PRODUCTS and a list of SCRAPED COMPETITOR PRODUCTS.
  Your job is to find the exact matching product from the competitor list for each of my products.

  MY PRODUCTS:
  ${JSON.stringify(myLuckyStoreProducts, null, 2)}

  COMPETITOR PRODUCTS:
  ${JSON.stringify(scrapedShwapnoProducts, null, 2)}

  Return ONLY a valid JSON array of objects with the exact mapping. Do not include markdown formatting. Format must be:
  [
    { 
      "my_sku": "LS-101", 
      "my_name": "...", 
      "competitor_name": "...", 
      "match_confidence": "98%", 
      "price": 90 
    }
  ]
  `;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0 } // Zero temperature so it doesn't hallucinate
      })
    });

    const data = await response.json();
    
    if (data.error) {
      console.error("❌ API ERROR:", data.error.message);
      return;
    }
    
    if (!data.candidates || data.candidates.length === 0) {
      console.error("❌ No valid response generated. Raw response:", data);
      return;
    }

    const resultText = data.candidates[0].content.parts[0].text;
    
    // Clean up markdown block if AI adds it accidentally
    const cleanJson = resultText.replace(/```json/g, "").replace(/```/g, "").trim();
    const mappedResults = JSON.parse(cleanJson);
    
    console.log("✅ AI MAPPING COMPLETE:");
    console.table(mappedResults);
    
    console.log("\nYou can now export this exact mapping table straight to your POS or Google Sheets!");
    
  } catch (error) {
    console.error("Error parsing AI response:", error);
  }
}

matchProductsWithAI();
