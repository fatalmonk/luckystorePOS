import { resolve } from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { execSync } from 'child_process';

const DRIFT_SEVERITY: Record<string, string> = {
    'migration_hash': 'CRITICAL',
    'rpc_hash': 'CRITICAL',
    'rls_hash': 'CRITICAL',
    'constraint_hash': 'HIGH',
    'index_hash': 'HIGH',
    'extension_hash': 'MEDIUM',
    'enum_hash': 'MEDIUM',
    'schema_hash': 'HIGH',
    'replay_logic_hash': 'CRITICAL'
};

function getClientReplayLogicHash(): string {
    const criticalFiles = [
        'apps/mobile_app/lib/offline/sync_engine.dart',
        'apps/mobile_app/lib/features/sales/offline_transaction_sync_service.dart'
    ];
    
    const combined = criticalFiles.map(f => {
        const p = resolve(process.cwd(), f);
        return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
    }).join('||');
    
    return crypto.createHash('sha256').update(combined).digest('hex');
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

async function getLocalFingerprint() {
    console.log('[FINGERPRINT] Fetching LOCAL fingerprint...');
    const sqlPath = resolve(process.cwd(), 'scripts/governance/get_fingerprint.sql');
    const maxRetries = 3;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const result = execSync(`supabase db query -o json -f ${sqlPath}`, { timeout: 15000 }).toString();
            const parsed = JSON.parse(result);
            const row = Array.isArray(parsed) ? parsed[0] : parsed.rows?.[0] ?? parsed.data?.[0] ?? parsed;
            const dbFingerprint = row?.fingerprint ?? row ?? {};
            
            return {
                ...dbFingerprint,
                replay_logic_hash: getClientReplayLogicHash()
            };
        } catch (e: any) {
            const msg = e?.stderr?.toString() || e?.message || '';
            if (attempt < maxRetries && (msg.includes('does not exist') || msg.includes('connection'))) {
                console.warn(`⚠️  Attempt ${attempt}/${maxRetries} failed (transient). Retrying in 2s...`);
                await sleep(2000);
            } else {
                console.error(`❌ Failed to get local fingerprint after ${attempt} attempt(s):`, msg.slice(0, 200));
                return null;
            }
        }
    }
    return null;
}

async function getStagingFingerprint() {
    const stagingPath = resolve(process.cwd(), 'artifacts/governance/staging-fingerprint.json');
    if (fs.existsSync(stagingPath)) {
        console.log('[FINGERPRINT] Found manual staging-fingerprint.json artifact.');
        return JSON.parse(fs.readFileSync(stagingPath, 'utf8'));
    }

    console.log('\n--- EPHEMERAL STAGING INTROSPECTION REQUIRED ---');
    console.log('To certify against staging, you must generate a staging fingerprint manually.');
    console.log('\n1. Run the following SQL in the Supabase SQL Editor on Staging:');
    console.log('---------------------------------------------------------');
    console.log(fs.readFileSync(resolve(process.cwd(), 'scripts/governance/get_fingerprint.sql'), 'utf8'));
    console.log('---------------------------------------------------------');
    console.log('\n2. Save the resulting JSON object to:');
    console.log('   artifacts/governance/staging-fingerprint.json');
    console.log('\n3. Rerun this script.');
    
    return null;
}

async function run() {
    const local = await getLocalFingerprint();
    const staging = await getStagingFingerprint();

    const report: any = {
        local,
        staging,
        match: false,
        drift: [],
        timestamp: new Date().toISOString()
    };

    if (local && staging) {
        const keys = Array.from(new Set([...Object.keys(local), ...Object.keys(staging)]));
        let match = true;
        for (const key of keys) {
            if (local[key] !== staging[key]) {
                match = false;
                report.drift.push({
                    component: key,
                    severity: DRIFT_SEVERITY[key] || 'UNKNOWN',
                    local: local[key],
                    staging: staging[key],
                    status: 'MISMATCH'
                });
            }
        }
        report.match = match;
    }

    const artifactsDir = resolve(process.cwd(), 'artifacts/governance');
    if (!fs.existsSync(artifactsDir)) fs.mkdirSync(artifactsDir, { recursive: true });
    
    fs.writeFileSync(
        resolve(artifactsDir, 'environment-fingerprint.json'),
        JSON.stringify(report, null, 2)
    );

    console.log('\n--- FINGERPRINT COMPARISON ---');
    console.log('Local:', local ? '✅' : '❌');
    console.log('Staging:', staging ? '✅' : '❌');
    
    if (local && staging) {
        if (report.match) {
            console.log('🎉 FINGERPRINTS MATCH! Semantic parity confirmed.');
        } else {
            console.log('❌ FINGERPRINT MISMATCH! Certification blocked.');
            report.drift.sort((a:any, b:any) => {
                const order = { 'CRITICAL': 0, 'HIGH': 1, 'MEDIUM': 2, 'UNKNOWN': 3 };
                return (order[a.severity as keyof typeof order] || 9) - (order[b.severity as keyof typeof order] || 9);
            }).forEach((d: any) => {
                console.log(`   - [${d.severity}] ${d.component.padEnd(20)}: local(${d.local}) != staging(${d.staging})`);
            });
            process.exit(1);
        }
    } else if (local) {
        console.log('⚠️  Awaiting staging-fingerprint.json to complete Phase 1.');
    }
}

run();
