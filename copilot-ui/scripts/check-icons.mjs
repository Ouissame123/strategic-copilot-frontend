import * as icons from '@untitledui/icons';

const names = [
  'Stars02', 'Stars01', 'Send01', 'User01', 'AlertTriangle', 'Briefcase01',
  'FileCheck02', 'Star01', 'GitBranch01', 'Beaker01', 'UserPlus01', 'Database01',
  'Trash01', 'XClose', 'ArrowRight', 'Activity', 'Calendar', 'Users01', 'Heart',
  'CurrencyDollar', 'Database', 'Beaker', 'GitBranch', 'UserPlus', 'FileCheck', 'X', 'ChevronDown',
];

for (const n of names) {
  console.log(n, n in icons ? 'OK' : 'MISSING');
}
