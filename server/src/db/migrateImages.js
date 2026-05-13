require('dotenv').config();
const { sequelize } = require('./index');
require('./models');
const { InventoryItem } = require('./models');

// Map SKU prefix → clean Unsplash product image (300×300, no logos)
const IMG = {
  SCR:  'https://images.unsplash.com/photo-1731391777974-18f9adb69490?w=300&h=300&fit=crop&q=80&auto=format',
  BAT:  'https://images.unsplash.com/photo-1512439408685-2e399291a4e6?w=300&h=300&fit=crop&q=80&auto=format',
  BKG:  'https://images.unsplash.com/photo-1588515603140-81bd9f7d1db0?w=300&h=300&fit=crop&q=80&auto=format',
  CHG:  'https://images.unsplash.com/photo-1536692192939-f1547f1cde39?w=300&h=300&fit=crop&q=80&auto=format',
  FCA:  'https://images.unsplash.com/photo-1639776738932-956082f0b704?w=300&h=300&fit=crop&q=80&auto=format',
  RCA:  'https://images.unsplash.com/photo-1611396000732-f8c9a933424f?w=300&h=300&fit=crop&q=80&auto=format',
  EAR:  'https://images.unsplash.com/photo-1746005514011-ea00280f3b6e?w=300&h=300&fit=crop&q=80&auto=format',
  SPK:  'https://images.unsplash.com/photo-1746005514009-892e6105fb5f?w=300&h=300&fit=crop&q=80&auto=format',
  HMB:  'https://images.unsplash.com/photo-1746005847031-8d00432342eb?w=300&h=300&fit=crop&q=80&auto=format',
  PWR:  'https://images.unsplash.com/photo-1746005514011-519402a89474?w=300&h=300&fit=crop&q=80&auto=format',
  VOL:  'https://images.unsplash.com/photo-1746005514011-519402a89474?w=300&h=300&fit=crop&q=80&auto=format',
  TAP:  'https://images.unsplash.com/photo-1746005718007-f7049ff86c6c?w=300&h=300&fit=crop&q=80&auto=format',
  SIM:  'https://images.unsplash.com/photo-1746005847012-d89286605db5?w=300&h=300&fit=crop&q=80&auto=format',
  FID:  'https://images.unsplash.com/photo-1639776739297-f7e1f21526f4?w=300&h=300&fit=crop&q=80&auto=format',
  ADH:  'https://images.unsplash.com/photo-1658212676082-312f25b52b3d?w=300&h=300&fit=crop&q=80&auto=format',
  TOOL: 'https://images.unsplash.com/photo-1578403881636-5da05e3f0aae?w=300&h=300&fit=crop&q=80&auto=format',
  // devices
  'DEV-IP':  'https://images.unsplash.com/photo-1592286927505-1def25115558?w=300&h=300&fit=crop&q=80&auto=format',
  'DEV-SS':  'https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=300&h=300&fit=crop&q=80&auto=format',
  'DEV-SSA': 'https://images.unsplash.com/photo-1565849904461-04a58ad377e0?w=300&h=300&fit=crop&q=80&auto=format',
  'DEV-SSZ': 'https://images.unsplash.com/photo-1587033411391-5d9e51cce126?w=300&h=300&fit=crop&q=80&auto=format',
};

function resolveImage(sku) {
  if (!sku) return null;
  // Longest prefix match
  const sorted = Object.keys(IMG).sort((a, b) => b.length - a.length);
  for (const prefix of sorted) {
    if (sku.startsWith(prefix)) return IMG[prefix];
  }
  return null;
}

async function run() {
  await sequelize.authenticate();

  // Add column if missing
  try {
    await sequelize.query("ALTER TABLE InventoryItems ADD COLUMN imageUrl VARCHAR(500)");
    console.log('✓ Added imageUrl column');
  } catch (e) {
    if (e.message.includes('duplicate column') || e.message.includes('already exists')) {
      console.log('  imageUrl column already present');
    } else {
      throw e;
    }
  }

  const all = await InventoryItem.findAll({ attributes: ['id', 'sku', 'imageUrl'] });
  let updated = 0, skipped = 0;

  for (const item of all) {
    const url = resolveImage(item.sku);
    if (!url) { skipped++; continue; }
    if (item.imageUrl === url) { skipped++; continue; }
    await InventoryItem.update({ imageUrl: url }, { where: { id: item.id } });
    updated++;
  }

  console.log(`✓ Updated ${updated} items with images, skipped ${skipped}`);
  process.exit(0);
}

run().catch(err => { console.error(err); process.exit(1); });
