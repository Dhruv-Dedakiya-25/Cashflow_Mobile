// Sample master data, the same people, units and categories as the web app's demo.
import type { CostLevel, NamedRecord, Person } from '@/api/types';

export const people: Person[] = [
  { id: 'emp-0001', nameEn: 'Khalid Al Harthy', nameAr: 'خالد الحارثي', designation: 'General Manager', departmentId: 'dep-hr' },
  { id: 'emp-0004', nameEn: 'Fatma Al Harthy', nameAr: 'فاطمة الحارثية', designation: 'Finance Manager', departmentId: 'dep-fin' },
  { id: 'emp-0012', nameEn: 'Said Al Hashmi', nameAr: 'سعيد الهاشمي', designation: 'Projects Manager', departmentId: 'dep-prj' },
  { id: 'emp-0017', nameEn: 'Ahmed Al Balushi', nameAr: 'أحمد البلوشي', designation: 'IT Manager', departmentId: 'dep-it' },
  { id: 'emp-0021', nameEn: 'Fatma Al Hinai', nameAr: 'فاطمة الهنائية', designation: 'Sales Coordinator', departmentId: 'dep-sales' },
  { id: 'emp-0029', nameEn: 'Hamed Al Rawahi', nameAr: 'حمد الرواحي', designation: 'Software Engineer', departmentId: 'dep-it' },
  { id: 'emp-0032', nameEn: 'Maryam Al Riyami', nameAr: 'مريم الريامية', designation: 'Project Engineer', departmentId: 'dep-prj' },
  { id: 'emp-0035', nameEn: 'Noor Al Lawati', nameAr: 'نور اللواتية', designation: 'Accountant', departmentId: 'dep-fin' },
];

export const P = {
  khalid: 'emp-0001',
  fatma: 'emp-0004',
  said: 'emp-0012',
  ahmed: 'emp-0017',
  fatmaHinai: 'emp-0021',
  hamed: 'emp-0029',
  maryam: 'emp-0032',
  noor: 'emp-0035',
} as const;

export const categories: NamedRecord[] = [
  { id: 'cat-001', nameEn: 'Local Travel', nameAr: 'التنقل المحلي' },
  { id: 'cat-002', nameEn: 'Fuel', nameAr: 'الوقود' },
  { id: 'cat-003', nameEn: 'Meals & Refreshments', nameAr: 'الوجبات والمرطبات' },
  { id: 'cat-004', nameEn: 'Office Supplies', nameAr: 'اللوازم المكتبية' },
  { id: 'cat-005', nameEn: 'Courier & Delivery', nameAr: 'البريد السريع والتوصيل' },
  { id: 'cat-006', nameEn: 'Parking & Tolls', nameAr: 'المواقف ورسوم الطرق' },
  { id: 'cat-007', nameEn: 'Accommodation', nameAr: 'الإقامة' },
  { id: 'cat-008', nameEn: 'Client / Business Meeting', nameAr: 'اجتماعات العملاء والأعمال' },
  { id: 'cat-009', nameEn: 'Minor Repairs & Maintenance', nameAr: 'الإصلاحات والصيانة البسيطة' },
  { id: 'cat-010', nameEn: 'Printing & Photocopying', nameAr: 'الطباعة والتصوير' },
  { id: 'cat-011', nameEn: 'Telephone / Mobile', nameAr: 'الهاتف / الجوال' },
  { id: 'cat-012', nameEn: 'Miscellaneous', nameAr: 'متفرقات' },
];

export const units: (NamedRecord & { level: CostLevel })[] = [
  { id: 'dep-it', level: 'department', nameEn: 'IT & Digital', nameAr: 'تقنية المعلومات والتحول الرقمي' },
  { id: 'dep-fin', level: 'department', nameEn: 'Finance', nameAr: 'المالية' },
  { id: 'dep-sales', level: 'department', nameEn: 'Sales', nameAr: 'المبيعات' },
  { id: 'dep-prj', level: 'department', nameEn: 'Projects', nameAr: 'إدارة المشاريع' },
  { id: 'dep-hr', level: 'department', nameEn: 'HR & Admin', nameAr: 'الموارد البشرية والإدارة' },
  { id: 'prj-001', level: 'project', nameEn: 'ERP Upgrade', nameAr: 'ترقية نظام تخطيط الموارد' },
  { id: 'prj-002', level: 'project', nameEn: 'Site Alpha', nameAr: 'موقع ألفا' },
  { id: 'prj-003', level: 'project', nameEn: 'CCTV Upgrade', nameAr: 'ترقية كاميرات المراقبة' },
];

/** The units a person's claim may be charged to, as their department and projects allow; the first is where it starts. */
export const unitsFor = (personId: string) =>
  personId === P.hamed || personId === P.ahmed ? ['dep-it', 'prj-001'] : personId === P.fatma ? ['dep-fin'] : ['prj-002', 'prj-003'];

export const vendors: NamedRecord[] = [
  { id: 'ven-001', nameEn: 'Al Maha Petroleum', nameAr: 'المها للبترول' },
  { id: 'sup-002', nameEn: 'Muscat Office Supplies', nameAr: 'مسقط للوازم المكتبية' },
  { id: 'ven-003', nameEn: 'Oman Taxi', nameAr: 'تاكسي عُمان' },
  { id: 'srv-006', nameEn: 'Swift Courier', nameAr: 'سويفت للبريد السريع' },
  { id: 'sup-007', nameEn: 'Al Noor Printing', nameAr: 'النور للطباعة' },
];

/** The three people the demo signs in as, one per kind of user. */
export type Persona = 'employee' | 'manager' | 'finance';

export const personas: { persona: Persona; personId: string; username: string }[] = [
  { persona: 'employee', personId: P.hamed, username: 'hamed.rawahi' },
  { persona: 'manager', personId: P.ahmed, username: 'ahmed.balushi' },
  { persona: 'finance', personId: P.fatma, username: 'fatma.harthy' },
];
