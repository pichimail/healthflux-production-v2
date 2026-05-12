import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const en = {
  nav: { home: 'Home', health: 'Health', ai: 'AI', wellness: 'Wellness', care: 'Care', account: 'Account' },
  common: { save: 'Save', cancel: 'Cancel', delete: 'Delete', edit: 'Edit', add: 'Add', close: 'Close', loading: 'Loading...', error: 'Error', success: 'Success', confirm: 'Confirm', back: 'Back', next: 'Next', done: 'Done', view: 'View all', search: 'Search', filter: 'Filter', export: 'Export', import: 'Import', share: 'Share', download: 'Download', upload: 'Upload', refresh: 'Refresh', settings: 'Settings', logout: 'Sign Out', admin: 'Admin' },
  dashboard: { title: 'Dashboard', healthScore: 'Health Score', vitals: 'Vitals', medications: 'Medications', wellness: 'Wellness', overview: 'Overview', noProfile: 'No profile found', createProfile: 'Create Profile', quickAdd: 'Quick Add', logVital: 'Log Vital', addMed: 'Add Medication', uploadDoc: 'Upload Document' },
  vitals: { title: 'Vitals', bp: 'Blood Pressure', hr: 'Heart Rate', temp: 'Temperature', weight: 'Weight', glucose: 'Blood Glucose', spo2: 'Oxygen Saturation', bmi: 'BMI', addReading: 'Add Reading', noReadings: 'No readings yet', trend: 'Trend' },
  medications: { title: 'Medications', active: 'Active', addMed: 'Add Medication', taken: 'Taken', skipped: 'Skipped', snoozed: 'Snoozed', refills: 'Refills', adherence: 'Adherence', reminders: 'Reminders', interactions: 'Interactions' },
  documents: { title: 'Documents', upload: 'Upload Document', processing: 'Processing...', summary: 'AI Summary', labReport: 'Lab Report', prescription: 'Prescription', noDocuments: 'No documents yet' },
  labs: { title: 'Lab Results', addResult: 'Add Result', normal: 'Normal', high: 'High', low: 'Low', noResults: 'No results yet' },
  ai: { title: 'AI Hub', assistant: 'Assistant', coach: 'Coach', reports: 'Reports', insights: 'Insights', generating: 'Generating...', askAnything: 'Ask anything about your health...' },
  wellness: { title: 'Wellness', goals: 'Goals', achievements: 'Achievements', streak: 'Streak', points: 'Points', level: 'Level', addGoal: 'Add Goal', logProgress: 'Log Progress' },
  care: { title: 'Care Hub', profiles: 'Profiles', addMember: 'Add Family Member', careCircle: 'Care Circle', telehealth: 'Telehealth', bookConsult: 'Book Consultation' },
  account: { title: 'Account', profile: 'Profile', preferences: 'Preferences', subscription: 'Subscription', security: 'Security', language: 'Language', theme: 'Theme', notifications: 'Notifications' },
  onboarding: { welcome: 'Welcome to HealthFlux', name: 'Full Name', dob: 'Date of Birth', gender: 'Gender', bloodGroup: 'Blood Group', height: 'Height', langInsurance: 'Language & Insurance', chooseLanguage: 'App Language', insuranceDoc: 'Health Insurance Document', optional: 'Optional', insuranceHelp: 'Upload your family health insurance card/document. We\'ll auto-extract family member details.', extracting: 'Extracting family details...', aiReading: 'AI is reading your document', uploadInsurance: 'Upload Insurance Document', membersFound: 'Family Members Found', review: 'Review', letsGo: "Let's Go!", createAllProfiles: 'Create All Profiles', settingUp: 'Setting up...', skip: 'Skip', step: 'Step', of: 'of' },
  errors: { loadFailed: 'Failed to load data', saveFailed: 'Failed to save', networkError: 'Network error', unauthorized: 'Unauthorized' },
};

const te = {
  nav: { home: 'హోమ్', health: 'ఆరోగ్యం', ai: 'AI', wellness: 'వెల్నెస్', care: 'కేర్', account: 'అకౌంట్' },
  common: { save: 'సేవ్', cancel: 'రద్దు', delete: 'తొలగించు', edit: 'సవరించు', add: 'జోడించు', close: 'మూసివేయి', loading: 'లోడ్ అవుతోంది...', error: 'లోపం', success: 'విజయం', confirm: 'నిర్ధారించు', back: 'వెనక్కి', next: 'తదుపరి', done: 'పూర్తయింది', view: 'అన్నీ చూడు', search: 'వెతుకు', filter: 'ఫిల్టర్', export: 'ఎగుమతి', import: 'దిగుమతి', share: 'షేర్', download: 'డౌన్‌లోడ్', upload: 'అప్‌లోడ్', refresh: 'రిఫ్రెష్', settings: 'సెట్టింగులు', logout: 'లాగ్ అవుట్', admin: 'అడ్మిన్' },
  dashboard: { title: 'డాష్‌బోర్డ్', healthScore: 'ఆరోగ్య స్కోర్', vitals: 'వైటల్స్', medications: 'మందులు', wellness: 'వెల్నెస్', overview: 'అవలోకనం', noProfile: 'ప్రొఫైల్ కనుగొనబడలేదు', createProfile: 'ప్రొఫైల్ సృష్టించు', quickAdd: 'త్వరగా జోడించు', logVital: 'వైటల్ నమోదు', addMed: 'మందు జోడించు', uploadDoc: 'పత్రం అప్‌లోడ్' },
  vitals: { title: 'వైటల్స్', bp: 'రక్తపోటు', hr: 'హృదయ స్పందన', temp: 'ఉష్ణోగ్రత', weight: 'బరువు', glucose: 'రక్తంలో గ్లూకోజ్', spo2: 'ఆక్సిజన్ సంతృప్తి', bmi: 'BMI', addReading: 'రీడింగ్ జోడించు', noReadings: 'ఇంకా రీడింగులు లేవు', trend: 'ట్రెండ్' },
  medications: { title: 'మందులు', active: 'క్రియాశీల', addMed: 'మందు జోడించు', taken: 'తీసుకున్నారు', skipped: 'దాటవేశారు', snoozed: 'స్నూజ్', refills: 'రిఫిల్లులు', adherence: 'అనుగుణత', reminders: 'రిమైండర్లు', interactions: 'పరస్పర చర్యలు' },
  documents: { title: 'పత్రాలు', upload: 'పత్రం అప్‌లోడ్', processing: 'ప్రాసెస్ అవుతోంది...', summary: 'AI సారాంశం', labReport: 'ల్యాబ్ నివేదిక', prescription: 'ప్రిస్క్రిప్షన్', noDocuments: 'ఇంకా పత్రాలు లేవు' },
  labs: { title: 'ల్యాబ్ ఫలితాలు', addResult: 'ఫలితం జోడించు', normal: 'సాధారణం', high: 'అధికం', low: 'తక్కువ', noResults: 'ఇంకా ఫలితాలు లేవు' },
  ai: { title: 'AI హబ్', assistant: 'సహాయకుడు', coach: 'కోచ్', reports: 'నివేదికలు', insights: 'అంతర్దృష్టులు', generating: 'రూపొందిస్తోంది...', askAnything: 'మీ ఆరోగ్యం గురించి ఏదైనా అడగండి...' },
  wellness: { title: 'వెల్నెస్', goals: 'లక్ష్యాలు', achievements: 'విజయాలు', streak: 'స్ట్రీక్', points: 'పాయింట్లు', level: 'స్థాయి', addGoal: 'లక్ష్యం జోడించు', logProgress: 'పురోగతి నమోదు' },
  care: { title: 'కేర్ హబ్', profiles: 'ప్రొఫైల్లు', addMember: 'కుటుంబ సభ్యుని జోడించు', careCircle: 'కేర్ సర్కిల్', telehealth: 'టెలిహెల్త్', bookConsult: 'సంప్రదింపు బుక్ చేయి' },
  account: { title: 'అకౌంట్', profile: 'ప్రొఫైల్', preferences: 'ప్రాధాన్యతలు', subscription: 'సభ్యత్వం', security: 'భద్రత', language: 'భాష', theme: 'థీమ్', notifications: 'నోటిఫికేషన్లు' },
  onboarding: { welcome: 'HealthFlux కి స్వాగతం', name: 'పూర్తి పేరు', dob: 'పుట్టిన తేదీ', gender: 'లింగం', bloodGroup: 'రక్త గ్రూపు', height: 'ఎత్తు', langInsurance: 'భాష & భీమా', chooseLanguage: 'యాప్ భాష', insuranceDoc: 'ఆరోగ్య భీమా పత్రం', optional: 'ఐచ్ఛికం', insuranceHelp: 'మీ కుటుంబ ఆరోగ్య భీమా కార్డు/పత్రం అప్‌లోడ్ చేయండి. మేము స్వయంచాలకంగా కుటుంబ సభ్యుల వివరాలను సేకరిస్తాము.', extracting: 'కుటుంబ వివరాలు సేకరిస్తోంది...', aiReading: 'AI మీ పత్రాన్ని చదువుతోంది', uploadInsurance: 'భీమా పత్రం అప్‌లోడ్', membersFound: 'కుటుంబ సభ్యులు కనుగొనబడ్డారు', review: 'సమీక్ష', letsGo: 'ప్రారంభించు!', createAllProfiles: 'అన్ని ప్రొఫైల్లు సృష్టించు', settingUp: 'సెటప్ అవుతోంది...', skip: 'దాటవేయి', step: 'స్టెప్', of: 'లో' },
  errors: { loadFailed: 'డేటా లోడ్ విఫలమైంది', saveFailed: 'సేవ్ విఫలమైంది', networkError: 'నెట్‌వర్క్ లోపం', unauthorized: 'అనధికారిక' },
};

const hi = {
  nav: { home: 'होम', health: 'स्वास्थ्य', ai: 'AI', wellness: 'वेलनेस', care: 'केयर', account: 'अकाउंट' },
  common: { save: 'सेव करें', cancel: 'रद्द करें', delete: 'हटाएं', edit: 'संपादित करें', add: 'जोड़ें', close: 'बंद करें', loading: 'लोड हो रहा है...', error: 'त्रुटि', success: 'सफलता', confirm: 'पुष्टि करें', back: 'वापस', next: 'आगे', done: 'हो गया', view: 'सभी देखें', search: 'खोजें', filter: 'फ़िल्टर', export: 'निर्यात', import: 'आयात', share: 'शेयर', download: 'डाउनलोड', upload: 'अपलोड', refresh: 'रिफ्रेश', settings: 'सेटिंग्स', logout: 'लॉग आउट', admin: 'एडमिन' },
  dashboard: { title: 'डैशबोर्ड', healthScore: 'स्वास्थ्य स्कोर', vitals: 'वाइटल्स', medications: 'दवाइयां', wellness: 'वेलनेस', overview: 'अवलोकन', noProfile: 'प्रोफ़ाइल नहीं मिली', createProfile: 'प्रोफ़ाइल बनाएं', quickAdd: 'जल्दी जोड़ें', logVital: 'वाइटल दर्ज करें', addMed: 'दवा जोड़ें', uploadDoc: 'दस्तावेज़ अपलोड करें' },
  vitals: { title: 'वाइटल्स', bp: 'रक्तचाप', hr: 'हृदय गति', temp: 'तापमान', weight: 'वजन', glucose: 'रक्त ग्लूकोज', spo2: 'ऑक्सीजन संतृप्ति', bmi: 'BMI', addReading: 'रीडिंग जोड़ें', noReadings: 'अभी कोई रीडिंग नहीं', trend: 'ट्रेंड' },
  medications: { title: 'दवाइयां', active: 'सक्रिय', addMed: 'दवा जोड़ें', taken: 'ली गई', skipped: 'छोड़ी गई', snoozed: 'स्नूज़', refills: 'रिफिल', adherence: 'अनुपालन', reminders: 'रिमाइंडर', interactions: 'इंटरैक्शन' },
  documents: { title: 'दस्तावेज़', upload: 'दस्तावेज़ अपलोड करें', processing: 'प्रोसेस हो रहा है...', summary: 'AI सारांश', labReport: 'लैब रिपोर्ट', prescription: 'प्रिस्क्रिप्शन', noDocuments: 'अभी कोई दस्तावेज़ नहीं' },
  labs: { title: 'लैब परिणाम', addResult: 'परिणाम जोड़ें', normal: 'सामान्य', high: 'अधिक', low: 'कम', noResults: 'अभी कोई परिणाम नहीं' },
  ai: { title: 'AI हब', assistant: 'सहायक', coach: 'कोच', reports: 'रिपोर्ट', insights: 'अंतर्दृष्टि', generating: 'बना रहा है...', askAnything: 'अपने स्वास्थ्य के बारे में कुछ भी पूछें...' },
  wellness: { title: 'वेलनेस', goals: 'लक्ष्य', achievements: 'उपलब्धियां', streak: 'स्ट्रीक', points: 'पॉइंट्स', level: 'स्तर', addGoal: 'लक्ष्य जोड़ें', logProgress: 'प्रगति दर्ज करें' },
  care: { title: 'केयर हब', profiles: 'प्रोफ़ाइल', addMember: 'परिवार सदस्य जोड़ें', careCircle: 'केयर सर्कल', telehealth: 'टेलीहेल्थ', bookConsult: 'परामर्श बुक करें' },
  account: { title: 'अकाउंट', profile: 'प्रोफ़ाइल', preferences: 'प्राथमिकताएं', subscription: 'सदस्यता', security: 'सुरक्षा', language: 'भाषा', theme: 'थीम', notifications: 'सूचनाएं' },
  onboarding: { welcome: 'HealthFlux में स्वागत है', name: 'पूरा नाम', dob: 'जन्म तिथि', gender: 'लिंग', bloodGroup: 'रक्त समूह', height: 'ऊंचाई', langInsurance: 'भाषा और बीमा', chooseLanguage: 'ऐप भाषा', insuranceDoc: 'स्वास्थ्य बीमा दस्तावेज़', optional: 'वैकल्पिक', insuranceHelp: 'अपना परिवार स्वास्थ्य बीमा कार्ड/दस्तावेज़ अपलोड करें। हम स्वचालित रूप से परिवार के सदस्यों का विवरण निकालेंगे।', extracting: 'परिवार का विवरण निकाल रहे हैं...', aiReading: 'AI आपका दस्तावेज़ पढ़ रहा है', uploadInsurance: 'बीमा दस्तावेज़ अपलोड करें', membersFound: 'परिवार के सदस्य मिले', review: 'समीक्षा', letsGo: 'शुरू करें!', createAllProfiles: 'सभी प्रोफ़ाइल बनाएं', settingUp: 'सेटअप हो रहा है...', skip: 'छोड़ें', step: 'चरण', of: 'में से' },
  errors: { loadFailed: 'डेटा लोड विफल', saveFailed: 'सेव विफल', networkError: 'नेटवर्क त्रुटि', unauthorized: 'अनधिकृत' },
};

const tinglish = {
  nav: { home: 'Home', health: 'Health', ai: 'AI', wellness: 'Wellness', care: 'Care', account: 'Account' },
  common: { save: 'Save cheyyi', cancel: 'Cancel cheyyi', delete: 'Delete cheyyi', edit: 'Edit cheyyi', add: 'Add cheyyi', close: 'Close cheyyi', loading: 'Loading avutundi...', error: 'Error vacchindi', success: 'Success ayindi', confirm: 'Confirm cheyyi', back: 'Back vellu', next: 'Next ki vellu', done: 'Done ayindi', view: 'Anni chuddu', search: 'Search cheyyi', filter: 'Filter cheyyi', export: 'Export cheyyi', import: 'Import cheyyi', share: 'Share cheyyi', download: 'Download cheyyi', upload: 'Upload cheyyi', refresh: 'Refresh cheyyi', settings: 'Settings', logout: 'Logout avvu', admin: 'Admin' },
  dashboard: { title: 'Dashboard', healthScore: 'Health Score', vitals: 'Vitals', medications: 'Medicines', wellness: 'Wellness', overview: 'Overview', noProfile: 'Profile ledu', createProfile: 'Profile create cheyyi', quickAdd: 'Quick ga add cheyyi', logVital: 'Vital log cheyyi', addMed: 'Medicine add cheyyi', uploadDoc: 'Document upload cheyyi' },
  vitals: { title: 'Vitals', bp: 'Blood Pressure', hr: 'Heart Rate', temp: 'Temperature', weight: 'Weight', glucose: 'Blood Sugar', spo2: 'Oxygen Level', bmi: 'BMI', addReading: 'Reading add cheyyi', noReadings: 'Inka readings levu', trend: 'Trend' },
  medications: { title: 'Medicines', active: 'Active', addMed: 'Medicine add cheyyi', taken: 'Teesukunnaru', skipped: 'Skip chesaru', snoozed: 'Snooze chesaru', refills: 'Refills', adherence: 'Adherence', reminders: 'Reminders', interactions: 'Interactions' },
  documents: { title: 'Documents', upload: 'Document upload cheyyi', processing: 'Processing avutundi...', summary: 'AI Summary', labReport: 'Lab Report', prescription: 'Prescription', noDocuments: 'Inka documents levu' },
  labs: { title: 'Lab Results', addResult: 'Result add cheyyi', normal: 'Normal', high: 'Ekkuva', low: 'Takkuva', noResults: 'Inka results levu' },
  ai: { title: 'AI Hub', assistant: 'Assistant', coach: 'Coach', reports: 'Reports', insights: 'Insights', generating: 'Generate avutundi...', askAnything: 'Meeru health gurinchi emi adugaina adugandi...' },
  wellness: { title: 'Wellness', goals: 'Goals', achievements: 'Achievements', streak: 'Streak', points: 'Points', level: 'Level', addGoal: 'Goal add cheyyi', logProgress: 'Progress log cheyyi' },
  care: { title: 'Care Hub', profiles: 'Profiles', addMember: 'Family member add cheyyi', careCircle: 'Care Circle', telehealth: 'Telehealth', bookConsult: 'Consultation book cheyyi' },
  account: { title: 'Account', profile: 'Profile', preferences: 'Preferences', subscription: 'Subscription', security: 'Security', language: 'Language', theme: 'Theme', notifications: 'Notifications' },
  onboarding: { welcome: 'HealthFlux ki Welcome', name: 'Full Name', dob: 'Date of Birth', gender: 'Gender', bloodGroup: 'Blood Group', height: 'Height', langInsurance: 'Language & Insurance', chooseLanguage: 'App Language', insuranceDoc: 'Health Insurance Document', optional: 'Optional', insuranceHelp: 'Mee family health insurance card/document upload cheyandi. Meemu automatically family members details extract chestam.', extracting: 'Family details extract avutundi...', aiReading: 'AI mee document chaduvutundi', uploadInsurance: 'Insurance Document Upload cheyyi', membersFound: 'Family Members Dorikaru', review: 'Review', letsGo: 'Start cheddham!', createAllProfiles: 'Anni Profiles Create cheyyi', settingUp: 'Setup avutundi...', skip: 'Skip cheyyi', step: 'Step', of: 'lo' },
  errors: { loadFailed: 'Data load kaaledhu', saveFailed: 'Save kaaledhu', networkError: 'Network error', unauthorized: 'Permission ledu' },
};

const savedLang = typeof window !== 'undefined'
  ? localStorage.getItem('hf_lang') || 'en'
  : 'en';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en:       { translation: en },
      te:       { translation: te },
      hi:       { translation: hi },
      tinglish: { translation: tinglish },
    },
    lng: savedLang,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });

export default i18n;