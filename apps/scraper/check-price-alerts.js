#!/usr/bin/env node
/**
 * Check price alerts after scraping
 * Identifies products where our price > 15% above competitor average
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const threshold = parseFloat(process.env.ALERT_THRESHOLD || '0.15');

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_KEY required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkPriceAlerts() {
  console.log(`Checking price alerts (threshold: ${threshold * 100}%)...`);
  
  try {
    // Get all stores with competitor price data
    const { data: stores, error: storeError } = await supabase
      .from('competitor_prices')
      .select('store_id')
      .gte('scraped_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .group('store_id');
    
    if (storeError) throw storeError;
    
    if (!stores || stores.length === 0) {
      console.log('No recent competitor data found');
      return;
    }
    
    for (const { store_id } of stores) {
      console.log(`\nChecking store: ${store_id}`);
      
      // Call RPC to check price alerts
      const { data: alerts, error } = await supabase.rpc('check_price_alerts', {
        p_store_id: store_id,
        p_threshold: threshold
      });
      
      if (error) throw error;
      
      if (!alerts || alerts.length === 0) {
        console.log('  No price alerts');
        continue;
      }
      
      console.log(`  ${alerts.length} price alerts found:`);
      
      for (const alert of alerts) {
        console.log(`    - ${alert.product_name}: ` +
          `Our ৳${alert.our_price} vs Market avg ৳${alert.market_avg_price} ` +
          `(${Math.round(alert.price_gap_percent * 100)}% above)`);
        
        // Insert alert into notifications table
        const { error: notifError } = await supabase
          .from('notifications')
          .insert({
            store_id,
            type: 'price_alert',
            title: `Price Alert: ${alert.product_name}`,
            message: `Our price (৳${alert.our_price}) is ${Math.round(alert.price_gap_percent * 100)}% above market average (৳${alert.market_avg_price})`,
            data: {
              product_id: alert.product_id,
              our_price: alert.our_price,
              market_avg_price: alert.market_avg_price,
              price_gap_percent: alert.price_gap_percent,
              competitors: alert.competitors
            },
            priority: alert.price_gap_percent > 0.25 ? 'high' : 'medium',
            read: false
          });
        
        if (notifError) {
          console.error('  Failed to create notification:', notifError);
        }
      }
    }
    
    console.log('\nPrice alert check complete');
    
  } catch (error) {
    console.error('Error checking price alerts:', error);
    process.exit(1);
  }
}

checkPriceAlerts();
