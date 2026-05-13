require('dotenv').config();
const { sequelize } = require('./index');
const { Store, InventoryItem } = require('./models');

// prettier-ignore
const PARTS = [
  // ─────────────────────────────────────────────────────────────────────────
  // SCREENS  [sku, name, compatibility, cost, price, minQty]
  // ─────────────────────────────────────────────────────────────────────────
  ['SCR-IP6-AM',    'iPhone 6 Screen (Aftermarket)',         'iPhone 6',           14.99,  44.99,  3],
  ['SCR-IP6-OEM',   'iPhone 6 Screen (OEM Quality)',         'iPhone 6',           22.99,  69.99,  2],
  ['SCR-IP6P-AM',   'iPhone 6 Plus Screen (Aftermarket)',    'iPhone 6 Plus',      17.99,  54.99,  3],
  ['SCR-IP6P-OEM',  'iPhone 6 Plus Screen (OEM Quality)',    'iPhone 6 Plus',      26.99,  79.99,  2],
  ['SCR-IP6S-AM',   'iPhone 6s Screen (Aftermarket)',        'iPhone 6s',          16.99,  49.99,  3],
  ['SCR-IP6S-OEM',  'iPhone 6s Screen (OEM Quality)',        'iPhone 6s',          24.99,  74.99,  2],
  ['SCR-IP6SP-AM',  'iPhone 6s Plus Screen (Aftermarket)',   'iPhone 6s Plus',     19.99,  59.99,  3],
  ['SCR-IP6SP-OEM', 'iPhone 6s Plus Screen (OEM Quality)',   'iPhone 6s Plus',     29.99,  84.99,  2],
  ['SCR-IP7-AM',    'iPhone 7 Screen (Aftermarket)',         'iPhone 7',           18.99,  54.99,  3],
  ['SCR-IP7-OEM',   'iPhone 7 Screen (OEM Quality)',         'iPhone 7',           27.99,  79.99,  2],
  ['SCR-IP7P-AM',   'iPhone 7 Plus Screen (Aftermarket)',    'iPhone 7 Plus',      22.99,  64.99,  3],
  ['SCR-IP7P-OEM',  'iPhone 7 Plus Screen (OEM Quality)',    'iPhone 7 Plus',      32.99,  89.99,  2],
  ['SCR-IP8-AM',    'iPhone 8 Screen (Aftermarket)',         'iPhone 8',           19.99,  59.99,  3],
  ['SCR-IP8-OEM',   'iPhone 8 Screen (OEM Quality)',         'iPhone 8',           28.99,  79.99,  2],
  ['SCR-IP8P-AM',   'iPhone 8 Plus Screen (Aftermarket)',    'iPhone 8 Plus',      23.99,  69.99,  3],
  ['SCR-IP8P-OEM',  'iPhone 8 Plus Screen (OEM Quality)',    'iPhone 8 Plus',      34.99,  94.99,  2],
  ['SCR-IPX-AM',    'iPhone X Screen (Aftermarket)',         'iPhone X',           39.99,  99.99,  3],
  ['SCR-IPX-OEM',   'iPhone X OLED Screen (OEM)',            'iPhone X',           54.99, 129.99,  2],
  ['SCR-IPXS-OEM',  'iPhone XS OLED Screen (OEM)',           'iPhone XS',          59.99, 139.99,  2],
  ['SCR-IPXSM-OEM', 'iPhone XS Max OLED Screen (OEM)',       'iPhone XS Max',      64.99, 149.99,  2],
  ['SCR-IPXR-AM',   'iPhone XR Screen (Aftermarket)',        'iPhone XR',          32.99,  89.99,  3],
  ['SCR-IPXR-OEM',  'iPhone XR Screen (OEM Quality)',        'iPhone XR',          44.99, 109.99,  2],
  ['SCR-IP11-AM',   'iPhone 11 Screen (Aftermarket)',        'iPhone 11',          34.99,  89.99,  3],
  ['SCR-IP11-OEM',  'iPhone 11 Screen (OEM Quality)',        'iPhone 11',          47.99, 114.99,  2],
  ['SCR-IP11P-OEM', 'iPhone 11 Pro OLED Screen (OEM)',       'iPhone 11 Pro',      64.99, 149.99,  2],
  ['SCR-IP11PM-OEM','iPhone 11 Pro Max OLED Screen (OEM)',   'iPhone 11 Pro Max',  74.99, 164.99,  2],
  ['SCR-IP12M-OEM', 'iPhone 12 Mini OLED Screen (OEM)',      'iPhone 12 Mini',     44.99, 109.99,  2],
  ['SCR-IP12-OEM',  'iPhone 12 OLED Screen (OEM)',           'iPhone 12',          54.99, 129.99,  2],
  ['SCR-IP12P-OEM', 'iPhone 12 Pro OLED Screen (OEM)',       'iPhone 12 Pro',      74.99, 159.99,  2],
  ['SCR-IP12PM-OEM','iPhone 12 Pro Max OLED Screen (OEM)',   'iPhone 12 Pro Max',  84.99, 174.99,  2],
  ['SCR-IP13M-OEM', 'iPhone 13 Mini OLED Screen (OEM)',      'iPhone 13 Mini',     54.99, 124.99,  2],
  ['SCR-IP13-OEM',  'iPhone 13 OLED Screen (OEM)',           'iPhone 13',          64.99, 144.99,  2],
  ['SCR-IP13P-OEM', 'iPhone 13 Pro OLED Screen (OEM)',       'iPhone 13 Pro',      84.99, 169.99,  2],
  ['SCR-IP13PM-OEM','iPhone 13 Pro Max OLED Screen (OEM)',   'iPhone 13 Pro Max',  94.99, 184.99,  2],
  ['SCR-IP14-OEM',  'iPhone 14 OLED Screen (OEM)',           'iPhone 14',          74.99, 154.99,  2],
  ['SCR-IP14PL-OEM','iPhone 14 Plus OLED Screen (OEM)',      'iPhone 14 Plus',     84.99, 164.99,  2],
  ['SCR-IP14P-OEM', 'iPhone 14 Pro OLED Screen (OEM)',       'iPhone 14 Pro',      94.99, 184.99,  2],
  ['SCR-IP14PM-OEM','iPhone 14 Pro Max OLED Screen (OEM)',   'iPhone 14 Pro Max', 104.99, 199.99,  2],
  ['SCR-IP15-OEM',  'iPhone 15 OLED Screen (OEM)',           'iPhone 15',          84.99, 169.99,  2],
  ['SCR-IP15PL-OEM','iPhone 15 Plus OLED Screen (OEM)',      'iPhone 15 Plus',     94.99, 184.99,  2],
  ['SCR-IP15P-OEM', 'iPhone 15 Pro OLED Screen (OEM)',       'iPhone 15 Pro',     109.99, 209.99,  2],
  ['SCR-IP15PM-OEM','iPhone 15 Pro Max OLED Screen (OEM)',   'iPhone 15 Pro Max', 119.99, 224.99,  2],
  ['SCR-IP16-OEM',  'iPhone 16 OLED Screen (OEM)',           'iPhone 16',          94.99, 184.99,  2],
  ['SCR-IP16PL-OEM','iPhone 16 Plus OLED Screen (OEM)',      'iPhone 16 Plus',    104.99, 199.99,  2],
  ['SCR-IP16P-OEM', 'iPhone 16 Pro OLED Screen (OEM)',       'iPhone 16 Pro',     124.99, 239.99,  2],
  ['SCR-IP16PM-OEM','iPhone 16 Pro Max OLED Screen (OEM)',   'iPhone 16 Pro Max', 139.99, 259.99,  2],

  // ─────────────────────────────────────────────────────────────────────────
  // BATTERIES
  // ─────────────────────────────────────────────────────────────────────────
  ['BAT-IP6',    'iPhone 6 Battery',          'iPhone 6',           7.99,  34.99,  5],
  ['BAT-IP6P',   'iPhone 6 Plus Battery',     'iPhone 6 Plus',      8.99,  34.99,  5],
  ['BAT-IP6S',   'iPhone 6s Battery',         'iPhone 6s',          7.99,  34.99,  5],
  ['BAT-IP6SP',  'iPhone 6s Plus Battery',    'iPhone 6s Plus',     8.99,  34.99,  5],
  ['BAT-IP7',    'iPhone 7 Battery',          'iPhone 7',           9.99,  39.99,  5],
  ['BAT-IP7P',   'iPhone 7 Plus Battery',     'iPhone 7 Plus',     10.99,  39.99,  5],
  ['BAT-IP8',    'iPhone 8 Battery',          'iPhone 8',           9.99,  39.99,  5],
  ['BAT-IP8P',   'iPhone 8 Plus Battery',     'iPhone 8 Plus',     10.99,  39.99,  5],
  ['BAT-IPX',    'iPhone X Battery',          'iPhone X',          14.99,  49.99,  5],
  ['BAT-IPXS',   'iPhone XS Battery',         'iPhone XS',         14.99,  49.99,  5],
  ['BAT-IPXSM',  'iPhone XS Max Battery',     'iPhone XS Max',     15.99,  54.99,  5],
  ['BAT-IPXR',   'iPhone XR Battery',         'iPhone XR',         14.99,  49.99,  5],
  ['BAT-IP11',   'iPhone 11 Battery',         'iPhone 11',         16.99,  54.99,  5],
  ['BAT-IP11P',  'iPhone 11 Pro Battery',     'iPhone 11 Pro',     17.99,  59.99,  5],
  ['BAT-IP11PM', 'iPhone 11 Pro Max Battery', 'iPhone 11 Pro Max', 18.99,  59.99,  5],
  ['BAT-IP12M',  'iPhone 12 Mini Battery',    'iPhone 12 Mini',    17.99,  59.99,  5],
  ['BAT-IP12',   'iPhone 12 Battery',         'iPhone 12',         18.99,  64.99,  5],
  ['BAT-IP12P',  'iPhone 12 Pro Battery',     'iPhone 12 Pro',     19.99,  64.99,  5],
  ['BAT-IP12PM', 'iPhone 12 Pro Max Battery', 'iPhone 12 Pro Max', 20.99,  69.99,  5],
  ['BAT-IP13M',  'iPhone 13 Mini Battery',    'iPhone 13 Mini',    19.99,  64.99,  5],
  ['BAT-IP13',   'iPhone 13 Battery',         'iPhone 13',         21.99,  69.99,  5],
  ['BAT-IP13P',  'iPhone 13 Pro Battery',     'iPhone 13 Pro',     22.99,  69.99,  5],
  ['BAT-IP13PM', 'iPhone 13 Pro Max Battery', 'iPhone 13 Pro Max', 23.99,  74.99,  5],
  ['BAT-IP14',   'iPhone 14 Battery',         'iPhone 14',         23.99,  74.99,  5],
  ['BAT-IP14PL', 'iPhone 14 Plus Battery',    'iPhone 14 Plus',    24.99,  74.99,  5],
  ['BAT-IP14P',  'iPhone 14 Pro Battery',     'iPhone 14 Pro',     25.99,  79.99,  5],
  ['BAT-IP14PM', 'iPhone 14 Pro Max Battery', 'iPhone 14 Pro Max', 26.99,  79.99,  5],
  ['BAT-IP15',   'iPhone 15 Battery',         'iPhone 15',         26.99,  79.99,  5],
  ['BAT-IP15PL', 'iPhone 15 Plus Battery',    'iPhone 15 Plus',    27.99,  84.99,  5],
  ['BAT-IP15P',  'iPhone 15 Pro Battery',     'iPhone 15 Pro',     28.99,  84.99,  5],
  ['BAT-IP15PM', 'iPhone 15 Pro Max Battery', 'iPhone 15 Pro Max', 29.99,  89.99,  5],
  ['BAT-IP16',   'iPhone 16 Battery',         'iPhone 16',         29.99,  89.99,  5],
  ['BAT-IP16PL', 'iPhone 16 Plus Battery',    'iPhone 16 Plus',    30.99,  89.99,  5],
  ['BAT-IP16P',  'iPhone 16 Pro Battery',     'iPhone 16 Pro',     32.99,  94.99,  5],
  ['BAT-IP16PM', 'iPhone 16 Pro Max Battery', 'iPhone 16 Pro Max', 34.99,  99.99,  5],

  // ─────────────────────────────────────────────────────────────────────────
  // BACK GLASS / HOUSING
  // ─────────────────────────────────────────────────────────────────────────
  ['BG-IP6',    'iPhone 6 Back Housing',          'iPhone 6',            8.99,  29.99,  3],
  ['BG-IP6P',   'iPhone 6 Plus Back Housing',     'iPhone 6 Plus',       9.99,  34.99,  3],
  ['BG-IP6S',   'iPhone 6s Back Housing',         'iPhone 6s',           8.99,  29.99,  3],
  ['BG-IP6SP',  'iPhone 6s Plus Back Housing',    'iPhone 6s Plus',      9.99,  34.99,  3],
  ['BG-IP7',    'iPhone 7 Back Housing',          'iPhone 7',            9.99,  34.99,  3],
  ['BG-IP7P',   'iPhone 7 Plus Back Housing',     'iPhone 7 Plus',      10.99,  39.99,  3],
  ['BG-IP8',    'iPhone 8 Back Glass',            'iPhone 8',            9.99,  34.99,  3],
  ['BG-IP8P',   'iPhone 8 Plus Back Glass',       'iPhone 8 Plus',      10.99,  39.99,  3],
  ['BG-IPX',    'iPhone X Back Glass',            'iPhone X',           14.99,  49.99,  3],
  ['BG-IPXS',   'iPhone XS Back Glass',           'iPhone XS',          14.99,  49.99,  3],
  ['BG-IPXSM',  'iPhone XS Max Back Glass',       'iPhone XS Max',      16.99,  54.99,  3],
  ['BG-IPXR',   'iPhone XR Back Glass',           'iPhone XR',          12.99,  44.99,  3],
  ['BG-IP11',   'iPhone 11 Back Glass',           'iPhone 11',          13.99,  44.99,  3],
  ['BG-IP11P',  'iPhone 11 Pro Back Glass',       'iPhone 11 Pro',      17.99,  54.99,  3],
  ['BG-IP11PM', 'iPhone 11 Pro Max Back Glass',   'iPhone 11 Pro Max',  18.99,  59.99,  3],
  ['BG-IP12',   'iPhone 12 Back Glass',           'iPhone 12',          16.99,  54.99,  3],
  ['BG-IP12P',  'iPhone 12 Pro Back Glass',       'iPhone 12 Pro',      19.99,  59.99,  3],
  ['BG-IP12PM', 'iPhone 12 Pro Max Back Glass',   'iPhone 12 Pro Max',  21.99,  64.99,  3],
  ['BG-IP13',   'iPhone 13 Back Glass',           'iPhone 13',          17.99,  54.99,  3],
  ['BG-IP13P',  'iPhone 13 Pro Back Glass',       'iPhone 13 Pro',      21.99,  64.99,  3],
  ['BG-IP13PM', 'iPhone 13 Pro Max Back Glass',   'iPhone 13 Pro Max',  23.99,  69.99,  3],
  ['BG-IP14',   'iPhone 14 Back Glass',           'iPhone 14',          19.99,  59.99,  3],
  ['BG-IP14PL', 'iPhone 14 Plus Back Glass',      'iPhone 14 Plus',     21.99,  64.99,  3],
  ['BG-IP14P',  'iPhone 14 Pro Back Glass',       'iPhone 14 Pro',      24.99,  69.99,  3],
  ['BG-IP14PM', 'iPhone 14 Pro Max Back Glass',   'iPhone 14 Pro Max',  26.99,  74.99,  3],
  ['BG-IP15',   'iPhone 15 Back Glass',           'iPhone 15',          21.99,  64.99,  3],
  ['BG-IP15PL', 'iPhone 15 Plus Back Glass',      'iPhone 15 Plus',     23.99,  69.99,  3],
  ['BG-IP15P',  'iPhone 15 Pro Titanium Back',    'iPhone 15 Pro',      27.99,  79.99,  3],
  ['BG-IP15PM', 'iPhone 15 Pro Max Titanium Back','iPhone 15 Pro Max',  29.99,  84.99,  3],
  ['BG-IP16',   'iPhone 16 Back Glass',           'iPhone 16',          23.99,  69.99,  3],
  ['BG-IP16PL', 'iPhone 16 Plus Back Glass',      'iPhone 16 Plus',     25.99,  74.99,  3],
  ['BG-IP16P',  'iPhone 16 Pro Titanium Back',    'iPhone 16 Pro',      29.99,  84.99,  3],
  ['BG-IP16PM', 'iPhone 16 Pro Max Titanium Back','iPhone 16 Pro Max',  32.99,  94.99,  3],

  // ─────────────────────────────────────────────────────────────────────────
  // CHARGING PORTS
  // ─────────────────────────────────────────────────────────────────────────
  ['CP-IP6',    'iPhone 6/6 Plus Charging Port (Lightning)',       'iPhone 6, 6 Plus',                        6.99, 29.99,  5],
  ['CP-IP6S',   'iPhone 6s/6s Plus Charging Port (Lightning)',    'iPhone 6s, 6s Plus',                      6.99, 29.99,  5],
  ['CP-IP7',    'iPhone 7/7 Plus Charging Port (Lightning)',       'iPhone 7, 7 Plus',                        7.99, 32.99,  5],
  ['CP-IP8',    'iPhone 8/8 Plus Charging Port (Lightning)',       'iPhone 8, 8 Plus',                        7.99, 32.99,  5],
  ['CP-IPX',    'iPhone X Charging Port (Lightning)',              'iPhone X',                                9.99, 34.99,  5],
  ['CP-IPXSXR', 'iPhone XS/XS Max/XR Charging Port (Lightning)', 'iPhone XS, XS Max, XR',                  10.99, 36.99,  5],
  ['CP-IP11',   'iPhone 11 Series Charging Port (Lightning)',     'iPhone 11, 11 Pro, 11 Pro Max',           10.99, 36.99,  5],
  ['CP-IP12',   'iPhone 12 Series Charging Port (Lightning)',     'iPhone 12, 12 Mini, 12 Pro, 12 Pro Max',  11.99, 38.99,  5],
  ['CP-IP13',   'iPhone 13 Series Charging Port (Lightning)',     'iPhone 13, 13 Mini, 13 Pro, 13 Pro Max',  11.99, 38.99,  5],
  ['CP-IP14',   'iPhone 14 Series Charging Port (Lightning)',     'iPhone 14, 14 Plus, 14 Pro, 14 Pro Max',  12.99, 39.99,  5],
  ['CP-IP15',   'iPhone 15 Series Charging Port (USB-C)',         'iPhone 15, 15 Plus, 15 Pro, 15 Pro Max',  14.99, 44.99,  5],
  ['CP-IP16',   'iPhone 16 Series Charging Port (USB-C)',         'iPhone 16, 16 Plus, 16 Pro, 16 Pro Max',  15.99, 47.99,  5],

  // ─────────────────────────────────────────────────────────────────────────
  // FRONT CAMERAS
  // ─────────────────────────────────────────────────────────────────────────
  ['CAM-F-IP6',    'iPhone 6/6 Plus Front Camera',             'iPhone 6, 6 Plus',                        4.99, 24.99,  3],
  ['CAM-F-IP6S',   'iPhone 6s/6s Plus Front Camera',          'iPhone 6s, 6s Plus',                      5.99, 26.99,  3],
  ['CAM-F-IP7',    'iPhone 7/7 Plus Front Camera',             'iPhone 7, 7 Plus',                        6.99, 29.99,  3],
  ['CAM-F-IP8',    'iPhone 8/8 Plus Front Camera',             'iPhone 8, 8 Plus',                        6.99, 29.99,  3],
  ['CAM-F-IPX',    'iPhone X Front Camera + Face ID Module',   'iPhone X',                               24.99, 69.99,  2],
  ['CAM-F-IPXS',   'iPhone XS/XS Max Front Camera Module',    'iPhone XS, XS Max',                      27.99, 74.99,  2],
  ['CAM-F-IPXR',   'iPhone XR Front Camera',                   'iPhone XR',                              12.99, 44.99,  3],
  ['CAM-F-IP11',   'iPhone 11 Front Camera',                   'iPhone 11',                              13.99, 46.99,  3],
  ['CAM-F-IP11P',  'iPhone 11 Pro/Pro Max Front Camera',       'iPhone 11 Pro, 11 Pro Max',              29.99, 79.99,  2],
  ['CAM-F-IP12',   'iPhone 12/12 Mini Front Camera',           'iPhone 12, 12 Mini',                     16.99, 49.99,  3],
  ['CAM-F-IP12P',  'iPhone 12 Pro/Pro Max Front Camera',       'iPhone 12 Pro, 12 Pro Max',              32.99, 84.99,  2],
  ['CAM-F-IP13',   'iPhone 13/13 Mini Front Camera',           'iPhone 13, 13 Mini',                     18.99, 54.99,  3],
  ['CAM-F-IP13P',  'iPhone 13 Pro/Pro Max Front Camera',       'iPhone 13 Pro, 13 Pro Max',              34.99, 89.99,  2],
  ['CAM-F-IP14',   'iPhone 14/14 Plus Front Camera',           'iPhone 14, 14 Plus',                     21.99, 59.99,  3],
  ['CAM-F-IP14P',  'iPhone 14 Pro/Pro Max Front Camera',       'iPhone 14 Pro, 14 Pro Max',              37.99, 94.99,  2],
  ['CAM-F-IP15',   'iPhone 15/15 Plus Front Camera',           'iPhone 15, 15 Plus',                     23.99, 64.99,  3],
  ['CAM-F-IP15P',  'iPhone 15 Pro/Pro Max Front Camera',       'iPhone 15 Pro, 15 Pro Max',              39.99, 99.99,  2],
  ['CAM-F-IP16',   'iPhone 16/16 Plus Front Camera',           'iPhone 16, 16 Plus',                     25.99, 69.99,  3],
  ['CAM-F-IP16P',  'iPhone 16 Pro/Pro Max Front Camera',       'iPhone 16 Pro, 16 Pro Max',              42.99,104.99,  2],

  // ─────────────────────────────────────────────────────────────────────────
  // REAR CAMERAS
  // ─────────────────────────────────────────────────────────────────────────
  ['CAM-R-IP6',    'iPhone 6/6 Plus Rear Camera',              'iPhone 6, 6 Plus',                        7.99, 29.99,  3],
  ['CAM-R-IP6S',   'iPhone 6s/6s Plus Rear Camera',           'iPhone 6s, 6s Plus',                      8.99, 32.99,  3],
  ['CAM-R-IP7',    'iPhone 7 Rear Camera',                     'iPhone 7',                               12.99, 39.99,  3],
  ['CAM-R-IP7P',   'iPhone 7 Plus Dual Rear Camera',           'iPhone 7 Plus',                          17.99, 54.99,  3],
  ['CAM-R-IP8',    'iPhone 8 Rear Camera',                     'iPhone 8',                               12.99, 39.99,  3],
  ['CAM-R-IP8P',   'iPhone 8 Plus Dual Rear Camera',           'iPhone 8 Plus',                          18.99, 57.99,  3],
  ['CAM-R-IPX',    'iPhone X Rear Camera (Dual)',              'iPhone X',                               22.99, 64.99,  3],
  ['CAM-R-IPXS',   'iPhone XS/XS Max Rear Camera (Dual)',     'iPhone XS, XS Max',                      26.99, 74.99,  2],
  ['CAM-R-IPXR',   'iPhone XR Rear Camera',                    'iPhone XR',                              16.99, 49.99,  3],
  ['CAM-R-IP11',   'iPhone 11 Rear Camera (Dual)',             'iPhone 11',                              22.99, 64.99,  3],
  ['CAM-R-IP11P',  'iPhone 11 Pro/Pro Max Rear Camera (Triple)','iPhone 11 Pro, 11 Pro Max',             39.99, 99.99,  2],
  ['CAM-R-IP12',   'iPhone 12/12 Mini Rear Camera (Dual)',     'iPhone 12, 12 Mini',                     27.99, 74.99,  3],
  ['CAM-R-IP12P',  'iPhone 12 Pro/Pro Max Rear Camera (Triple)','iPhone 12 Pro, 12 Pro Max',             47.99,114.99,  2],
  ['CAM-R-IP13',   'iPhone 13/13 Mini Rear Camera (Dual)',     'iPhone 13, 13 Mini',                     31.99, 84.99,  3],
  ['CAM-R-IP13P',  'iPhone 13 Pro/Pro Max Rear Camera (Triple)','iPhone 13 Pro, 13 Pro Max',             54.99,129.99,  2],
  ['CAM-R-IP14',   'iPhone 14/14 Plus Rear Camera (Dual)',     'iPhone 14, 14 Plus',                     34.99, 89.99,  3],
  ['CAM-R-IP14P',  'iPhone 14 Pro/Pro Max Rear Camera (Triple)','iPhone 14 Pro, 14 Pro Max',             59.99,139.99,  2],
  ['CAM-R-IP15',   'iPhone 15/15 Plus Rear Camera (Dual)',     'iPhone 15, 15 Plus',                     37.99, 94.99,  3],
  ['CAM-R-IP15P',  'iPhone 15 Pro/Pro Max Rear Camera (Triple)','iPhone 15 Pro, 15 Pro Max',             64.99,149.99,  2],
  ['CAM-R-IP16',   'iPhone 16/16 Plus Rear Camera (Dual)',     'iPhone 16, 16 Plus',                     39.99, 99.99,  3],
  ['CAM-R-IP16P',  'iPhone 16 Pro/Pro Max Rear Camera (Triple)','iPhone 16 Pro, 16 Pro Max',             69.99,159.99,  2],

  // ─────────────────────────────────────────────────────────────────────────
  // EARPIECE SPEAKERS
  // ─────────────────────────────────────────────────────────────────────────
  ['ESP-IP6',   'iPhone 6/6 Plus Earpiece Speaker',         'iPhone 6, 6 Plus',                        3.99, 19.99,  5],
  ['ESP-IP6S',  'iPhone 6s/6s Plus Earpiece Speaker',      'iPhone 6s, 6s Plus',                      3.99, 19.99,  5],
  ['ESP-IP7',   'iPhone 7/7 Plus Earpiece Speaker',         'iPhone 7, 7 Plus',                        4.99, 22.99,  5],
  ['ESP-IP8',   'iPhone 8/8 Plus Earpiece Speaker',         'iPhone 8, 8 Plus',                        4.99, 22.99,  5],
  ['ESP-IPX',   'iPhone X Earpiece Speaker',                'iPhone X',                                6.99, 27.99,  5],
  ['ESP-IPXS',  'iPhone XS/XS Max/XR Earpiece Speaker',   'iPhone XS, XS Max, XR',                   7.99, 29.99,  5],
  ['ESP-IP11',  'iPhone 11 Series Earpiece Speaker',        'iPhone 11, 11 Pro, 11 Pro Max',           8.99, 32.99,  5],
  ['ESP-IP12',  'iPhone 12 Series Earpiece Speaker',        'iPhone 12, 12 Mini, 12 Pro, 12 Pro Max',  9.99, 34.99,  5],
  ['ESP-IP13',  'iPhone 13 Series Earpiece Speaker',        'iPhone 13, 13 Mini, 13 Pro, 13 Pro Max', 10.99, 36.99,  5],
  ['ESP-IP14',  'iPhone 14 Series Earpiece Speaker',        'iPhone 14, 14 Plus, 14 Pro, 14 Pro Max', 11.99, 38.99,  5],
  ['ESP-IP15',  'iPhone 15 Series Earpiece Speaker',        'iPhone 15, 15 Plus, 15 Pro, 15 Pro Max', 12.99, 42.99,  5],
  ['ESP-IP16',  'iPhone 16 Series Earpiece Speaker',        'iPhone 16, 16 Plus, 16 Pro, 16 Pro Max', 13.99, 44.99,  5],

  // ─────────────────────────────────────────────────────────────────────────
  // LOUD SPEAKERS
  // ─────────────────────────────────────────────────────────────────────────
  ['LSP-IP6',   'iPhone 6/6 Plus Loud Speaker',         'iPhone 6, 6 Plus',                        4.99, 22.99,  5],
  ['LSP-IP6S',  'iPhone 6s/6s Plus Loud Speaker',      'iPhone 6s, 6s Plus',                      4.99, 22.99,  5],
  ['LSP-IP7',   'iPhone 7/7 Plus Loud Speaker',         'iPhone 7, 7 Plus',                        5.99, 24.99,  5],
  ['LSP-IP8',   'iPhone 8/8 Plus Loud Speaker',         'iPhone 8, 8 Plus',                        5.99, 24.99,  5],
  ['LSP-IPX',   'iPhone X Loud Speaker',                'iPhone X',                                7.99, 29.99,  5],
  ['LSP-IPXS',  'iPhone XS/XS Max/XR Loud Speaker',   'iPhone XS, XS Max, XR',                   8.99, 32.99,  5],
  ['LSP-IP11',  'iPhone 11 Series Loud Speaker',        'iPhone 11, 11 Pro, 11 Pro Max',           9.99, 34.99,  5],
  ['LSP-IP12',  'iPhone 12 Series Loud Speaker',        'iPhone 12, 12 Mini, 12 Pro, 12 Pro Max', 10.99, 36.99,  5],
  ['LSP-IP13',  'iPhone 13 Series Loud Speaker',        'iPhone 13, 13 Mini, 13 Pro, 13 Pro Max', 11.99, 38.99,  5],
  ['LSP-IP14',  'iPhone 14 Series Loud Speaker',        'iPhone 14, 14 Plus, 14 Pro, 14 Pro Max', 12.99, 42.99,  5],
  ['LSP-IP15',  'iPhone 15 Series Loud Speaker',        'iPhone 15, 15 Plus, 15 Pro, 15 Pro Max', 13.99, 44.99,  5],
  ['LSP-IP16',  'iPhone 16 Series Loud Speaker',        'iPhone 16, 16 Plus, 16 Pro, 16 Pro Max', 14.99, 47.99,  5],

  // ─────────────────────────────────────────────────────────────────────────
  // HOME BUTTONS (iPhone 6 – iPhone 8)
  // ─────────────────────────────────────────────────────────────────────────
  ['HB-IP6',   'iPhone 6 Home Button (No Touch ID)',       'iPhone 6',       3.99, 19.99,  5],
  ['HB-IP6P',  'iPhone 6 Plus Home Button (No Touch ID)', 'iPhone 6 Plus',  3.99, 19.99,  5],
  ['HB-IP6S',  'iPhone 6s Home Button Flex',               'iPhone 6s',      5.99, 24.99,  5],
  ['HB-IP6SP', 'iPhone 6s Plus Home Button Flex',          'iPhone 6s Plus', 5.99, 24.99,  5],
  ['HB-IP7',   'iPhone 7 Home Button Flex',                'iPhone 7',       6.99, 27.99,  5],
  ['HB-IP7P',  'iPhone 7 Plus Home Button Flex',           'iPhone 7 Plus',  6.99, 27.99,  5],
  ['HB-IP8',   'iPhone 8 Home Button Flex',                'iPhone 8',       6.99, 27.99,  5],
  ['HB-IP8P',  'iPhone 8 Plus Home Button Flex',           'iPhone 8 Plus',  6.99, 27.99,  5],

  // ─────────────────────────────────────────────────────────────────────────
  // POWER / VOLUME / MUTE FLEX CABLES
  // ─────────────────────────────────────────────────────────────────────────
  ['PWR-IP6',   'iPhone 6/6 Plus Power Button Flex',        'iPhone 6, 6 Plus',                        4.99, 19.99,  5],
  ['PWR-IP6S',  'iPhone 6s/6s Plus Power Button Flex',     'iPhone 6s, 6s Plus',                      4.99, 19.99,  5],
  ['PWR-IP7',   'iPhone 7/7 Plus Power Button Flex',        'iPhone 7, 7 Plus',                        5.99, 22.99,  5],
  ['PWR-IP8',   'iPhone 8/8 Plus Power Button Flex',        'iPhone 8, 8 Plus',                        5.99, 22.99,  5],
  ['PWR-IPX',   'iPhone X Power Button Flex',               'iPhone X',                                7.99, 27.99,  5],
  ['PWR-IP11',  'iPhone 11 Series Power/Side Button Flex',  'iPhone 11, 11 Pro, 11 Pro Max',           8.99, 29.99,  5],
  ['PWR-IP12',  'iPhone 12 Series Power/Side Button Flex',  'iPhone 12, 12 Mini, 12 Pro, 12 Pro Max',  9.99, 32.99,  5],
  ['PWR-IP13',  'iPhone 13 Series Power/Side Button Flex',  'iPhone 13, 13 Mini, 13 Pro, 13 Pro Max', 10.99, 34.99,  5],
  ['PWR-IP14',  'iPhone 14 Series Power/Side Button Flex',  'iPhone 14, 14 Plus, 14 Pro, 14 Pro Max', 11.99, 36.99,  5],
  ['PWR-IP15',  'iPhone 15 Series Power/Side Button Flex',  'iPhone 15, 15 Plus, 15 Pro, 15 Pro Max', 12.99, 38.99,  5],
  ['PWR-IP16',  'iPhone 16 Series Power/Side Button Flex',  'iPhone 16, 16 Plus, 16 Pro, 16 Pro Max', 13.99, 42.99,  5],

  ['VOL-IP6',   'iPhone 6/6 Plus Volume + Mute Flex',       'iPhone 6, 6 Plus',                        4.99, 19.99,  5],
  ['VOL-IP6S',  'iPhone 6s/6s Plus Volume + Mute Flex',    'iPhone 6s, 6s Plus',                      4.99, 19.99,  5],
  ['VOL-IP7',   'iPhone 7/7 Plus Volume + Mute Flex',       'iPhone 7, 7 Plus',                        5.99, 22.99,  5],
  ['VOL-IP8',   'iPhone 8/8 Plus Volume + Mute Flex',       'iPhone 8, 8 Plus',                        5.99, 22.99,  5],
  ['VOL-IPX',   'iPhone X Volume + Mute Flex',              'iPhone X',                                7.99, 27.99,  5],
  ['VOL-IP11',  'iPhone 11 Series Volume + Mute Flex',      'iPhone 11, 11 Pro, 11 Pro Max',           8.99, 29.99,  5],
  ['VOL-IP12',  'iPhone 12 Series Volume + Mute Flex',      'iPhone 12, 12 Mini, 12 Pro, 12 Pro Max',  9.99, 32.99,  5],
  ['VOL-IP13',  'iPhone 13 Series Volume + Mute Flex',      'iPhone 13, 13 Mini, 13 Pro, 13 Pro Max', 10.99, 34.99,  5],
  ['VOL-IP14',  'iPhone 14 Series Volume + Mute Flex',      'iPhone 14, 14 Plus, 14 Pro, 14 Pro Max', 11.99, 36.99,  5],
  ['VOL-IP15',  'iPhone 15 Series Volume + Mute Flex',      'iPhone 15, 15 Plus, 15 Pro, 15 Pro Max', 12.99, 38.99,  5],
  ['VOL-IP16',  'iPhone 16 Series Volume / Action Flex',    'iPhone 16, 16 Plus, 16 Pro, 16 Pro Max', 13.99, 42.99,  5],

  // ─────────────────────────────────────────────────────────────────────────
  // TAPTIC ENGINE / VIBRATOR
  // ─────────────────────────────────────────────────────────────────────────
  ['TAP-IP6',   'iPhone 6/6 Plus Vibrator Motor',       'iPhone 6, 6 Plus',                        4.99, 19.99,  5],
  ['TAP-IP6S',  'iPhone 6s/6s Plus Vibrator Motor',    'iPhone 6s, 6s Plus',                      4.99, 19.99,  5],
  ['TAP-IP7',   'iPhone 7/7 Plus Taptic Engine',        'iPhone 7, 7 Plus',                        7.99, 27.99,  5],
  ['TAP-IP8',   'iPhone 8/8 Plus Taptic Engine',        'iPhone 8, 8 Plus',                        7.99, 27.99,  5],
  ['TAP-IPX',   'iPhone X Taptic Engine',               'iPhone X',                               11.99, 39.99,  5],
  ['TAP-IP11',  'iPhone 11 Series Taptic Engine',       'iPhone 11, 11 Pro, 11 Pro Max',          12.99, 42.99,  5],
  ['TAP-IP12',  'iPhone 12 Series Taptic Engine',       'iPhone 12, 12 Mini, 12 Pro, 12 Pro Max', 13.99, 44.99,  5],
  ['TAP-IP13',  'iPhone 13 Series Taptic Engine',       'iPhone 13, 13 Mini, 13 Pro, 13 Pro Max', 14.99, 47.99,  5],
  ['TAP-IP14',  'iPhone 14 Series Taptic Engine',       'iPhone 14, 14 Plus, 14 Pro, 14 Pro Max', 15.99, 49.99,  5],
  ['TAP-IP15',  'iPhone 15 Series Taptic Engine',       'iPhone 15, 15 Plus, 15 Pro, 15 Pro Max', 16.99, 52.99,  5],
  ['TAP-IP16',  'iPhone 16 Series Taptic Engine',       'iPhone 16, 16 Plus, 16 Pro, 16 Pro Max', 17.99, 54.99,  5],

  // ─────────────────────────────────────────────────────────────────────────
  // SIM TRAYS
  // ─────────────────────────────────────────────────────────────────────────
  ['SIM-IP6',   'iPhone 6/6 Plus SIM Tray',         'iPhone 6, 6 Plus',                        1.99,  9.99, 10],
  ['SIM-IP6S',  'iPhone 6s/6s Plus SIM Tray',      'iPhone 6s, 6s Plus',                      1.99,  9.99, 10],
  ['SIM-IP7',   'iPhone 7/7 Plus SIM Tray',         'iPhone 7, 7 Plus',                        1.99,  9.99, 10],
  ['SIM-IP8',   'iPhone 8/8 Plus SIM Tray',         'iPhone 8, 8 Plus',                        1.99,  9.99, 10],
  ['SIM-IPX',   'iPhone X/XS/XR SIM Tray',          'iPhone X, XS, XS Max, XR',               2.49, 10.99, 10],
  ['SIM-IP11',  'iPhone 11 Series SIM Tray',        'iPhone 11, 11 Pro, 11 Pro Max',           2.49, 10.99, 10],
  ['SIM-IP12',  'iPhone 12 Series SIM Tray',        'iPhone 12, 12 Mini, 12 Pro, 12 Pro Max',  2.49, 10.99, 10],
  ['SIM-IP13',  'iPhone 13 Series SIM Tray',        'iPhone 13, 13 Mini, 13 Pro, 13 Pro Max',  2.49, 10.99, 10],
  ['SIM-IP14',  'iPhone 14 Series SIM Tray',        'iPhone 14, 14 Plus, 14 Pro, 14 Pro Max',  2.99, 11.99, 10],
  ['SIM-IP15',  'iPhone 15 Series SIM Tray',        'iPhone 15, 15 Plus, 15 Pro, 15 Pro Max',  2.99, 11.99, 10],
  ['SIM-IP16',  'iPhone 16 Series SIM Tray',        'iPhone 16, 16 Plus, 16 Pro, 16 Pro Max',  2.99, 11.99, 10],

  // ─────────────────────────────────────────────────────────────────────────
  // FACE ID / PROXIMITY SENSOR MODULES
  // ─────────────────────────────────────────────────────────────────────────
  ['FID-IPX',   'iPhone X Face ID Front Module',              'iPhone X',                               34.99, 89.99,  2],
  ['FID-IPXS',  'iPhone XS/XS Max Face ID Front Module',     'iPhone XS, XS Max',                      37.99, 94.99,  2],
  ['FID-IP11',  'iPhone 11 Series Face ID Module',            'iPhone 11, 11 Pro, 11 Pro Max',          39.99, 99.99,  2],
  ['FID-IP12',  'iPhone 12 Series Face ID Module',            'iPhone 12, 12 Mini, 12 Pro, 12 Pro Max', 42.99,104.99,  2],
  ['FID-IP13',  'iPhone 13 Series Face ID Module',            'iPhone 13, 13 Mini, 13 Pro, 13 Pro Max', 44.99,109.99,  2],
  ['FID-IP14',  'iPhone 14 Series Face ID Module',            'iPhone 14, 14 Plus, 14 Pro, 14 Pro Max', 47.99,114.99,  2],
  ['FID-IP15',  'iPhone 15 Series Face ID Module',            'iPhone 15, 15 Plus, 15 Pro, 15 Pro Max', 49.99,119.99,  2],
  ['FID-IP16',  'iPhone 16 Series Face ID Module',            'iPhone 16, 16 Plus, 16 Pro, 16 Pro Max', 52.99,124.99,  2],

  // ─────────────────────────────────────────────────────────────────────────
  // MISC / TOOLS / ADHESIVES
  // ─────────────────────────────────────────────────────────────────────────
  ['ADH-WATPROOF', 'Waterproof Screen Adhesive Tape (Universal)',    'Universal',  1.99,  7.99, 20],
  ['ADH-B7000',    'B7000 Adhesive Glue 15ml',                       'Universal',  2.99,  9.99, 10],
  ['TOOL-PENTALOBE','Pentalobe Screwdriver Set (iPhone)',             'Universal',  3.99, 14.99,  5],
  ['TOOL-SPUDGER',  'Plastic Prying Tool / Spudger Set',             'Universal',  2.99, 11.99,  5],
  ['TOOL-SUCTION',  'Suction Cup Screen Removal Tool',               'Universal',  1.99,  7.99,  5],
];

async function seedParts() {
  await sequelize.authenticate();

  const store = await Store.findOne();
  if (!store) {
    console.error('No store found — run npm run seed first.');
    process.exit(1);
  }

  let created = 0;
  let skipped = 0;

  for (const [sku, name, modelCompatibility, cost, price, minQuantity] of PARTS) {
    const exists = await InventoryItem.findOne({ where: { sku, storeId: store.id } });
    if (exists) { skipped++; continue; }

    await InventoryItem.create({
      storeId: store.id,
      sku,
      name,
      category: 'part',
      brand: 'Apple',
      modelCompatibility,
      quantity: 0,
      minQuantity,
      cost,
      price,
      active: true,
    });
    created++;
  }

  console.log(`\nDone! Created ${created} parts, skipped ${skipped} duplicates.`);
  console.log(`Total iPhone parts in system: ${created + skipped}`);
  process.exit(0);
}

seedParts().catch(e => { console.error(e); process.exit(1); });
