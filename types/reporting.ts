// types/reporting.ts
export enum IssuePriority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
}

export enum IssueCategory {
  INFRASTRUCTURE = "Infrastructure",
  UTILITIES = "Utilities",
  ENVIRONMENT = "Environment",
  PUBLIC_SAFETY = "Public Safety",
  SOCIAL_SERVICES = "Social Services",
  OTHER = "Other",
}

export interface AIAnalysis {
  title: string;
  summary: string;
  category: IssueCategory;
  priority: IssuePriority;
}

export interface ReportData {
  originalDescription: string;
  reportedBy: string;
  assignedTo?: string;
  createdAt: any; // Firestore Timestamp
  status: "pending" | "in_progress" | "resolved" | "closed" | "rejected";
  location: {
    latitude: number;
    longitude: number;
    address: string;
    barangay: string;
    city: string;
    province: string;
  };
  images: string[]; // URLs to Firebase Storage
  aiGeneratedAnalysis: AIAnalysis;
  submittedAnonymously?: boolean;
}

export enum WizardStep {
  DESCRIBE_ISSUE = 1,
  ADD_LOCATION = 2,
  REVIEW_SUBMIT = 3,
  SUBMISSION_SUCCESS = 4,
}

/**
 * List of all barangays in Baguio City
 * Use this constant for dropdown menus, autocomplete, or validation
 */
export const BAGUIO_BARANGAYS = [
  'A. BONIFACIO-CAGUIOA-RIMANDO (ABCR)',
  'ABANAO-ZANDUETA-KAYONG-CHUGUM-OTEK (AZKCO)',
  'ALFONSO TABORA',
  'AMBIONG',
  'ANDRES BONIFACIO (LOWER BOKAWKAN)',
  'ASIN ROAD',
  'ATOK TRAIL',
  'AURORA HILL PROPER',
  'BAKAKENG CENTRAL',
  'BAKAKENG NORTE/SUR',
  'BAL-MARCOVILLE (MARCOVILLE)',
  'BALSIGAN',
  'BAYAN PARK EAST',
  'BAYAN PARK VILLAGE',
  'BGH COMPOUND',
  'BROOKSIDE',
  'BROOKSPOINT',
  'CABINET HIIL T. CAMP',
  'CAMDAS SUBDIVISION',
  'CAMP 7',
  'CAMP 8',
  'CAMP ALLEN',
  'CAMPO FILIPINO',
  'CITY CAMP CENTRAL',
  'CITY CAMP PROPER',
  'COUNTRY CLUB VILLAGE',
  'CRESENCIA VILLAGE',
  'DIZON SUBDIVISION',
  'DOMINICAN-MIRADOR',
  'DONTOGAN',
  'DPS COMPOUND',
  'EAST MODERN SITE',
  'EAST QUIRINO HILL',
  'ENGINEERS HILL',
  'FAIRVIEW',
  'FERDINAND',
  'FORT DEL PILAR',
  'GABRIELA SILANG',
  'GEFA (LOWER Q.M)',
  'GIBRALTAR',
  'GREEN WATER',
  'GUISAD CENTRAL',
  'GUISAD SURONG',
  'HAPPY HOLLOW',
  'HAPPY HOMES-LUCBAN',
  'HARRISON-CARRANTES',
  'HILLSIDE',
  'HOLYGHOST EXTENSION',
  'HOLYGHOST PROPER',
  'HONEYMOON-HOLYGHOST',
  'IMELDA MARCOS',
  'IMELDA VILLAGE',
  'IRISAN',
  'KABAYANIHAN',
  'KAGITINGAN',
  'KAYANG EXTENSION',
  'KAYANG HILLTOP',
  'KIAS',
  'LEGARDA-BURNHAM-KISAD',
  'LOAKAN APUGAN',
  'LOAKAN LIWANAG',
  'LOAKAN PROPER',
  'LOPEZ JAENA',
  'LOURDES SUBDIVISION EXTENSION',
  'LOURDES SUBDIVISION PROPER',
  'LOWER DAGSIAN',
  'LOWER GENERAL LUNA',
  'LOWER LOURDES SUBDIVISION',
  'LOWER MAGSAYSAY',
  'LOWER QUIRINO HILL',
  'LOWER ROCK QUARRY',
  'LUALHATI',
  'LUCNAB',
  'MAGSAYSAY PRIVATE RD.',
  'MALCOLM SQUARE',
  'MANUEL ROXAS',
  'MIDDLE QUEZON HILL',
  'MIDDLE QUIRINO HILL',
  'MIDDLE ROCK QUARRY',
  'MILITARY CUT-OFF',
  'MINES VIEW PARK',
  'MRR-QUEEN OF PEACE',
  'NEW LUCBAN',
  'NORTH CENTRAL AURORA HILL',
  'NORTH SANITARY CAMP',
  'OUTLOOK DRIVE',
  'PACDAL',
  'PADRE BURGOS',
  'PADRE ZAMORA',
  'PALMA-URBANO',
  'PHIL-AM',
  'PINGET',
  'PINSAO PILOT PROJECT',
  'PINSAO PROPER',
  'POLIWES',
  'PUCSUSAN',
  'QUEZON HILL PROPER',
  'QUIRINO-MAGSAYSAY (UPPER QM)',
  'RIZAL MONUMENT',
  'SAINT JOSEPH VILLAGE',
  'SALUD MITRA',
  'SAN ANTONIO VILLAGE',
  'SAN LUIS VILLAGE',
  'SAN ROQUE VILLAGE',
  'SAN VICENTE',
  'SANTA ESCOLASTICA',
  'SANTO ROSARIO',
  'SANTO TOMAS PROPER',
  'SANTO TOMAS SCHOOL AREA',
  'SCOUT BARRIO',
  'SESSION ROAD',
  'SLAUGHTER HOUSE AREA (SANTO NIÑO SLAUGTHER)',
  'SLU-SVP',
  'SOUTH CENTRAL AURORA HILL',
  'SOUTH DRIVE',
  'SOUTH SANITARY CAMP',
  'TEODORA ALONZO',
  'TRANCOVILLE',
  'UPPER DAGSIAN',
  'UPPER GENERAL LUNA',
  'UPPER MAGSAYSAY',
  'UPPER MARKET SUBDIVISION',
  'UPPER QUEZON HILL',
  'UPPER ROCK QUARRY',
  'VICTORIA VILLAGE',
  'WEST BAYAN PARK',
  'WEST MODERNSITE',
  'WEST QUIRINO HILL'
] as const;

/**
 * Type representing valid Baguio barangay names
 */
export type BaguioBarangay = typeof BAGUIO_BARANGAYS[number];

