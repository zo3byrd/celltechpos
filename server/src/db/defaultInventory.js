// Default POS inventory — seeded into new stores via /api/admin/stores/:id/seed-inventory
const IMG = {
  // Services
  SVC_SCREEN:  'https://images.unsplash.com/photo-1530893609608-32a9af3aa95c?w=300&h=300&fit=crop&q=80',
  SVC_BATTERY: 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=300&h=300&fit=crop&q=80',
  SVC_PORT:    'https://images.unsplash.com/photo-1601972599748-e3a3cfe8df12?w=300&h=300&fit=crop&q=80',
  SVC_DIAG:    'https://images.unsplash.com/photo-1573920012782-efc22b5e2e87?w=300&h=300&fit=crop&q=80',
  SVC_DATA:    'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=300&h=300&fit=crop&q=80',
  SVC_UNLOCK:  'https://images.unsplash.com/photo-1563986768494-4dee2763ff3f?w=300&h=300&fit=crop&q=80',
  SVC_GLASS:   'https://images.unsplash.com/photo-1526045612212-70caf35c14df?w=300&h=300&fit=crop&q=80',
  // Parts
  PART_SCREEN: 'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=300&h=300&fit=crop&q=80',
  PART_BATT:   'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=300&h=300&fit=crop&q=80',
  PART_PORT:   'https://images.unsplash.com/photo-1601972599748-e3a3cfe8df12?w=300&h=300&fit=crop&q=80',
  // Accessories
  CASE_CLEAR:  'https://images.unsplash.com/photo-1601784551446-20c9e07cdbdb?w=300&h=300&fit=crop&q=80',
  CASE_RUGGED: 'https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=300&h=300&fit=crop&q=80',
  SCREEN_PROT: 'https://images.unsplash.com/photo-1583394838336-acd977736f90?w=300&h=300&fit=crop&q=80',
  CABLE_USBC:  'https://images.unsplash.com/photo-1601972599748-e3a3cfe8df12?w=300&h=300&fit=crop&q=80',
  CABLE_LIGHT: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?w=300&h=300&fit=crop&q=80',
  CHARGER:     'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300&h=300&fit=crop&q=80',
  WIRELESS_CH: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=300&h=300&fit=crop&q=80',
  CAR_CHARGE:  'https://images.unsplash.com/photo-1608042314453-ae338d682c93?w=300&h=300&fit=crop&q=80',
  EARBUDS:     'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=300&h=300&fit=crop&q=80',
  HEADPHONES:  'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&h=300&fit=crop&q=80',
  POWER_BANK:  'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=300&h=300&fit=crop&q=80',
  POPSOCKET:   'https://images.unsplash.com/photo-1622060679122-a55c79f15c99?w=300&h=300&fit=crop&q=80',
  STAND:       'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=300&h=300&fit=crop&q=80',
  SD_CARD:     'https://images.unsplash.com/photo-1597852074816-d933c7d2b988?w=300&h=300&fit=crop&q=80',
  WALLET_CARD: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=300&h=300&fit=crop&q=80',
  // Plans (SIM/carrier)
  PLAN:        'https://images.unsplash.com/photo-1598327105666-5b89351aff97?w=300&h=300&fit=crop&q=80',
};

function item(sku, name, category, cost, price, qty, minQty, imageKey, extra = {}) {
  return {
    sku,
    name,
    category,
    cost,
    price,
    quantity:    category === 'service' ? 999 : qty,
    minQuantity: category === 'service' ? 0   : minQty,
    active: true,
    imageUrl: IMG[imageKey] || null,
    ...extra,
  };
}

const SERVICES = [
  item('SVC-DIAG',        'Diagnostic Fee',                    'service', 0,     29.99, 999, 0, 'SVC_DIAG'),
  item('SVC-SCR-IP',      'iPhone Screen Repair',              'service', 0,     89.99, 999, 0, 'SVC_SCREEN',  { brand: 'Apple' }),
  item('SVC-SCR-SS',      'Samsung Screen Repair',             'service', 0,     79.99, 999, 0, 'SVC_SCREEN',  { brand: 'Samsung' }),
  item('SVC-SCR-OTHER',   'Screen Repair - Other Device',      'service', 0,     69.99, 999, 0, 'SVC_SCREEN'),
  item('SVC-BAT-IP',      'iPhone Battery Replacement',        'service', 0,     59.99, 999, 0, 'SVC_BATTERY', { brand: 'Apple' }),
  item('SVC-BAT-SS',      'Samsung Battery Replacement',       'service', 0,     49.99, 999, 0, 'SVC_BATTERY', { brand: 'Samsung' }),
  item('SVC-PORT-IP',     'iPhone Charging Port Repair',       'service', 0,     69.99, 999, 0, 'SVC_PORT',    { brand: 'Apple' }),
  item('SVC-PORT-SS',     'Samsung Charging Port Repair',      'service', 0,     59.99, 999, 0, 'SVC_PORT',    { brand: 'Samsung' }),
  item('SVC-GLASS-IP',    'iPhone Back Glass Repair',          'service', 0,     99.99, 999, 0, 'SVC_GLASS',   { brand: 'Apple' }),
  item('SVC-GLASS-SS',    'Samsung Back Glass Repair',         'service', 0,     89.99, 999, 0, 'SVC_GLASS',   { brand: 'Samsung' }),
  item('SVC-CAM',         'Camera Repair',                     'service', 0,     79.99, 999, 0, 'SVC_SCREEN'),
  item('SVC-SPK',         'Speaker / Microphone Repair',       'service', 0,     59.99, 999, 0, 'SVC_SCREEN'),
  item('SVC-WATER',       'Water Damage Treatment',            'service', 0,     69.99, 999, 0, 'SVC_SCREEN'),
  item('SVC-DATA',        'Data Recovery',                     'service', 0,    149.99, 999, 0, 'SVC_DATA'),
  item('SVC-UNLOCK',      'Network Unlock',                    'service', 0,     29.99, 999, 0, 'SVC_UNLOCK'),
  item('SVC-ICLOUD',      'iCloud / Activation Lock Removal',  'service', 0,     49.99, 999, 0, 'SVC_UNLOCK', { brand: 'Apple' }),
  item('SVC-SOFT',        'Software Restore / Factory Reset',  'service', 0,     39.99, 999, 0, 'SVC_DIAG'),
  item('SVC-SCREEN-PROT', 'Screen Protector Installation',     'service', 0,     14.99, 999, 0, 'SCREEN_PROT'),
];

const PARTS = [
  // iPhone screens (most common)
  item('PRT-SCR-IP15-OEM',  'iPhone 15 OLED Screen (OEM)',       'part', 84.99, 169.99, 3, 2, 'PART_SCREEN', { brand:'Apple', modelCompatibility:'iPhone 15' }),
  item('PRT-SCR-IP14-OEM',  'iPhone 14 OLED Screen (OEM)',       'part', 74.99, 154.99, 3, 2, 'PART_SCREEN', { brand:'Apple', modelCompatibility:'iPhone 14' }),
  item('PRT-SCR-IP13-OEM',  'iPhone 13 OLED Screen (OEM)',       'part', 64.99, 144.99, 3, 2, 'PART_SCREEN', { brand:'Apple', modelCompatibility:'iPhone 13' }),
  item('PRT-SCR-IP12-OEM',  'iPhone 12 OLED Screen (OEM)',       'part', 54.99, 129.99, 3, 2, 'PART_SCREEN', { brand:'Apple', modelCompatibility:'iPhone 12' }),
  item('PRT-SCR-IP11-OEM',  'iPhone 11 Screen (OEM)',            'part', 47.99, 114.99, 3, 2, 'PART_SCREEN', { brand:'Apple', modelCompatibility:'iPhone 11' }),
  item('PRT-SCR-S24-OEM',   'Samsung S24 Screen (OEM)',          'part', 89.99, 179.99, 2, 2, 'PART_SCREEN', { brand:'Samsung', modelCompatibility:'Galaxy S24' }),
  item('PRT-SCR-S23-OEM',   'Samsung S23 Screen (OEM)',          'part', 79.99, 159.99, 2, 2, 'PART_SCREEN', { brand:'Samsung', modelCompatibility:'Galaxy S23' }),
  item('PRT-SCR-A15',       'Samsung A15 Screen',                'part', 34.99,  74.99, 3, 2, 'PART_SCREEN', { brand:'Samsung', modelCompatibility:'Galaxy A15' }),
  item('PRT-SCR-A14',       'Samsung A14 Screen',                'part', 29.99,  64.99, 3, 2, 'PART_SCREEN', { brand:'Samsung', modelCompatibility:'Galaxy A14' }),
  // Batteries
  item('PRT-BAT-IP15',      'iPhone 15 Battery',                 'part', 22.99,  59.99, 5, 3, 'PART_BATT', { brand:'Apple', modelCompatibility:'iPhone 15' }),
  item('PRT-BAT-IP14',      'iPhone 14 Battery',                 'part', 20.99,  54.99, 5, 3, 'PART_BATT', { brand:'Apple', modelCompatibility:'iPhone 14' }),
  item('PRT-BAT-IP13',      'iPhone 13 Battery',                 'part', 18.99,  49.99, 5, 3, 'PART_BATT', { brand:'Apple', modelCompatibility:'iPhone 13' }),
  item('PRT-BAT-IP12',      'iPhone 12 Battery',                 'part', 16.99,  44.99, 5, 3, 'PART_BATT', { brand:'Apple', modelCompatibility:'iPhone 12' }),
  item('PRT-BAT-IP11',      'iPhone 11 Battery',                 'part', 14.99,  39.99, 5, 3, 'PART_BATT', { brand:'Apple', modelCompatibility:'iPhone 11' }),
  item('PRT-BAT-S24',       'Samsung S24 Battery',               'part', 24.99,  59.99, 3, 2, 'PART_BATT', { brand:'Samsung', modelCompatibility:'Galaxy S24' }),
  item('PRT-BAT-S23',       'Samsung S23 Battery',               'part', 22.99,  54.99, 3, 2, 'PART_BATT', { brand:'Samsung', modelCompatibility:'Galaxy S23' }),
  item('PRT-BAT-A14',       'Samsung A14 Battery',               'part', 14.99,  39.99, 3, 2, 'PART_BATT', { brand:'Samsung', modelCompatibility:'Galaxy A14' }),
  // Charging ports
  item('PRT-PORT-IP14',     'iPhone 14 Charging Port (USB-C)',   'part', 14.99,  39.99, 3, 2, 'PART_PORT', { brand:'Apple', modelCompatibility:'iPhone 14/15' }),
  item('PRT-PORT-IP13',     'iPhone 13 Lightning Port',          'part', 12.99,  34.99, 3, 2, 'PART_PORT', { brand:'Apple', modelCompatibility:'iPhone 13' }),
  item('PRT-PORT-S23',      'Samsung S23 Charging Port',         'part', 12.99,  34.99, 3, 2, 'PART_PORT', { brand:'Samsung', modelCompatibility:'Galaxy S23/S24' }),
  item('PRT-PORT-A14',      'Samsung A14 Charging Port',         'part',  9.99,  29.99, 3, 2, 'PART_PORT', { brand:'Samsung', modelCompatibility:'Galaxy A14/A15' }),
];

const ACCESSORIES = [
  // Cases
  item('ACC-CASE-CLR-IP15',  'iPhone 15 Clear Case',             'accessory',  4.99, 14.99, 10, 5, 'CASE_CLEAR', { brand:'Apple', modelCompatibility:'iPhone 15' }),
  item('ACC-CASE-CLR-IP14',  'iPhone 14 Clear Case',             'accessory',  4.99, 14.99, 10, 5, 'CASE_CLEAR', { brand:'Apple', modelCompatibility:'iPhone 14' }),
  item('ACC-CASE-CLR-IP13',  'iPhone 13 Clear Case',             'accessory',  4.99, 12.99, 10, 5, 'CASE_CLEAR', { brand:'Apple', modelCompatibility:'iPhone 13' }),
  item('ACC-CASE-CLR-SS24',  'Samsung S24 Clear Case',           'accessory',  4.99, 14.99, 10, 5, 'CASE_CLEAR', { brand:'Samsung', modelCompatibility:'Galaxy S24' }),
  item('ACC-CASE-CLR-SSA15', 'Samsung A15 Clear Case',           'accessory',  3.99, 12.99, 10, 5, 'CASE_CLEAR', { brand:'Samsung', modelCompatibility:'Galaxy A15' }),
  item('ACC-CASE-RUG-UNIV',  'Heavy Duty Rugged Case (Univ.)',   'accessory',  8.99, 24.99, 8,  4, 'CASE_RUGGED'),
  item('ACC-CASE-WALLET',    'Wallet Phone Case (Universal)',    'accessory',  6.99, 19.99, 8,  4, 'WALLET_CARD'),
  // Screen protectors
  item('ACC-SP-IP15-TG',     'iPhone 15 Tempered Glass (2-pk)', 'accessory',  2.99,  9.99, 15, 5, 'SCREEN_PROT', { brand:'Apple', modelCompatibility:'iPhone 15' }),
  item('ACC-SP-IP14-TG',     'iPhone 14 Tempered Glass (2-pk)', 'accessory',  2.99,  9.99, 15, 5, 'SCREEN_PROT', { brand:'Apple', modelCompatibility:'iPhone 14' }),
  item('ACC-SP-IP13-TG',     'iPhone 13 Tempered Glass (2-pk)', 'accessory',  2.99,  9.99, 15, 5, 'SCREEN_PROT', { brand:'Apple', modelCompatibility:'iPhone 13' }),
  item('ACC-SP-SS24-TG',     'Samsung S24 Tempered Glass',      'accessory',  2.99,  9.99, 15, 5, 'SCREEN_PROT', { brand:'Samsung', modelCompatibility:'Galaxy S24' }),
  item('ACC-SP-SSA15-TG',    'Samsung A15 Tempered Glass',      'accessory',  1.99,  7.99, 15, 5, 'SCREEN_PROT', { brand:'Samsung', modelCompatibility:'Galaxy A15' }),
  item('ACC-SP-PRIV',        'Privacy Screen Protector (Univ.)','accessory',  4.99, 14.99, 8,  4, 'SCREEN_PROT'),
  // Cables
  item('ACC-CBL-USBC-3FT',   'USB-C Cable 3ft',                 'accessory',  2.99,  9.99, 20, 8, 'CABLE_USBC'),
  item('ACC-CBL-USBC-6FT',   'USB-C Cable 6ft',                 'accessory',  3.99, 12.99, 20, 8, 'CABLE_USBC'),
  item('ACC-CBL-LIGHT-3FT',  'Lightning Cable 3ft',             'accessory',  3.49, 11.99, 20, 8, 'CABLE_LIGHT'),
  item('ACC-CBL-LIGHT-6FT',  'Lightning Cable 6ft',             'accessory',  4.49, 14.99, 20, 8, 'CABLE_LIGHT'),
  item('ACC-CBL-USBC-LIGHT',  'USB-C to Lightning Cable 3ft',   'accessory',  4.99, 14.99, 15, 6, 'CABLE_LIGHT'),
  // Chargers
  item('ACC-CHG-20W',        '20W USB-C Fast Charger',          'accessory',  7.99, 22.99, 12, 5, 'CHARGER'),
  item('ACC-CHG-65W',        '65W Multi-Port Fast Charger',     'accessory', 12.99, 34.99, 8,  4, 'CHARGER'),
  item('ACC-CHG-WL-PAD',     'Wireless Charging Pad (15W)',     'accessory',  9.99, 27.99, 8,  4, 'WIRELESS_CH'),
  item('ACC-CHG-WL-STAND',   'Wireless Charging Stand (15W)',   'accessory', 12.99, 32.99, 6,  3, 'WIRELESS_CH'),
  item('ACC-CHG-CAR-USBC',   'USB-C Car Charger (45W)',         'accessory',  5.99, 18.99, 10, 4, 'CAR_CHARGE'),
  item('ACC-CHG-CAR-DUAL',   'Dual Port Car Charger',           'accessory',  4.99, 14.99, 10, 4, 'CAR_CHARGE'),
  // Audio
  item('ACC-EAR-WLESS',      'Wireless Earbuds',                'accessory', 14.99, 39.99, 8,  4, 'EARBUDS'),
  item('ACC-EAR-WIRED',      'Wired Earbuds w/ Mic',            'accessory',  3.99, 12.99, 12, 5, 'EARBUDS'),
  item('ACC-EAR-BTH-OVER',   'Bluetooth Over-Ear Headphones',   'accessory', 19.99, 54.99, 5,  3, 'HEADPHONES'),
  // Power banks
  item('ACC-PWR-10K',        'Power Bank 10000mAh',             'accessory', 12.99, 34.99, 6,  3, 'POWER_BANK'),
  item('ACC-PWR-20K',        'Power Bank 20000mAh',             'accessory', 18.99, 49.99, 6,  3, 'POWER_BANK'),
  // Grips & mounts
  item('ACC-POP-GRIP',       'PopSocket Phone Grip',            'accessory',  2.99,  9.99, 15, 6, 'POPSOCKET'),
  item('ACC-MNT-CAR-VENT',   'Car Vent Phone Mount',            'accessory',  4.99, 14.99, 8,  4, 'STAND'),
  item('ACC-STAND-DESK',     'Adjustable Desktop Phone Stand',  'accessory',  5.99, 16.99, 6,  3, 'STAND'),
  // Storage
  item('ACC-MSD-64GB',       'MicroSD Card 64GB',               'accessory',  6.99, 19.99, 10, 4, 'SD_CARD'),
  item('ACC-MSD-128GB',      'MicroSD Card 128GB',              'accessory', 10.99, 27.99, 10, 4, 'SD_CARD'),
  item('ACC-MSD-256GB',      'MicroSD Card 256GB',              'accessory', 16.99, 39.99, 8,  4, 'SD_CARD'),
];

const PLANS = [
  // Boost Mobile
  item('PLAN-BOOST-25',    'Boost Mobile $25/mo — 2GB',          'plan', 20, 25, 20, 5, 'PLAN'),
  item('PLAN-BOOST-35',    'Boost Mobile $35/mo — 5GB',          'plan', 28, 35, 20, 5, 'PLAN'),
  item('PLAN-BOOST-50',    'Boost Mobile $50/mo — Unlimited',    'plan', 40, 50, 20, 5, 'PLAN'),
  item('PLAN-BOOST-65',    'Boost Mobile $65/mo — Prem Unlim',   'plan', 52, 65, 15, 5, 'PLAN'),
  // Metro PCS
  item('PLAN-METRO-30',    'Metro PCS $30/mo — 2GB',             'plan', 24, 30, 20, 5, 'PLAN'),
  item('PLAN-METRO-40',    'Metro PCS $40/mo — Unlimited',       'plan', 32, 40, 20, 5, 'PLAN'),
  item('PLAN-METRO-60',    'Metro PCS $60/mo — Unlim+',          'plan', 48, 60, 15, 5, 'PLAN'),
  // Cricket
  item('PLAN-CRICKET-25',  'Cricket $25/mo — Basic 5GB',         'plan', 20, 25, 20, 5, 'PLAN'),
  item('PLAN-CRICKET-35',  'Cricket $35/mo — 10GB',              'plan', 28, 35, 20, 5, 'PLAN'),
  item('PLAN-CRICKET-50',  'Cricket $50/mo — Unlimited',         'plan', 40, 50, 20, 5, 'PLAN'),
  // T-Mobile Prepaid
  item('PLAN-TMOB-35',     'T-Mobile Prepaid $35/mo',            'plan', 28, 35, 15, 5, 'PLAN'),
  item('PLAN-TMOB-50',     'T-Mobile Prepaid $50/mo — Unlim',    'plan', 40, 50, 15, 5, 'PLAN'),
  // AT&T Prepaid
  item('PLAN-ATT-30',      'AT&T Prepaid $30/mo — 5GB',          'plan', 24, 30, 15, 5, 'PLAN'),
  item('PLAN-ATT-50',      'AT&T Prepaid $50/mo — Unlimited',    'plan', 40, 50, 15, 5, 'PLAN'),
  // Visible
  item('PLAN-VISIBLE-25',  'Visible $25/mo — Unlimited',         'plan', 20, 25, 15, 5, 'PLAN'),
  // Straight Talk
  item('PLAN-ST-30',       'Straight Talk $30/mo — 3GB',         'plan', 24, 30, 15, 5, 'PLAN'),
  item('PLAN-ST-45',       'Straight Talk $45/mo — Unlimited',   'plan', 36, 45, 15, 5, 'PLAN'),
  // Hotspot / Add-ons
  item('PLAN-HOTSPOT-10G', 'Mobile Hotspot Add-On 10GB',         'plan',  8, 10, 10, 4, 'PLAN'),
  item('PLAN-INTL',        'International Calling Add-On',       'plan', 10, 15, 10, 4, 'PLAN'),
  item('PLAN-SIMCARD',     'SIM Card (Activation SIM)',          'plan',  0,  0, 30, 10, 'PLAN'),
];

function getDefaultItems() {
  return [...SERVICES, ...PARTS, ...ACCESSORIES, ...PLANS];
}

module.exports = { getDefaultItems };
