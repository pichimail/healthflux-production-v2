/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import ABHASettings from './pages/ABHASettings';
import AIMedicalImaging from './pages/AIMedicalImaging';
import SkinAssessment from './pages/SkinAssessment';
import PersonalizedDiet from './pages/PersonalizedDiet';
import AIAssistant from './pages/AIAssistant';
import AIHealthCoach from './pages/AIHealthCoach';
import AIHealthReports from './pages/AIHealthReports';
import AIHub from './pages/AIHub';
import AccountHub from './pages/AccountHub';
import AdminAIOps from './pages/AdminAIOps';
import AdminAds from './pages/AdminAds';
import AdminAnalytics from './pages/AdminAnalytics';
import AdminAssistant from './pages/AdminAssistant';
import AdminDashboard from './pages/AdminDashboard';
import AdminDocuments from './pages/AdminDocuments';
import AdminFeatureFlags from './pages/AdminFeatureFlags';
import AdminInsights from './pages/AdminInsights';
import AdminIntegrations from './pages/AdminIntegrations';
import AdminLogin from './pages/AdminLogin';
import AdminMedications from './pages/AdminMedications';
import AdminNotifications from './pages/AdminNotifications';
import AdminPackages from './pages/AdminPackages';
import AdminProfiles from './pages/AdminProfiles';
import AdminRoles from './pages/AdminRoles';
import AdminSubscriptions from './pages/AdminSubscriptions';
import AdminUsers from './pages/AdminUsers';
import AdminVitals from './pages/AdminVitals';
import CareCircle from './pages/CareCircle';
import CareHub from './pages/CareHub';
import Dashboard from './pages/Dashboard';
import Demo from './pages/Demo';
import Documents from './pages/Documents';
import EmergencyProfile from './pages/EmergencyProfile';
import ExportReports from './pages/ExportReports';
import GamificationDashboard from './pages/GamificationDashboard';
import HealthHub from './pages/HealthHub';
import Nutrition from './pages/Nutrition';
import Home from './pages/Home';
import Insights from './pages/Insights';
import LabResults from './pages/LabResults';
import Landing from './pages/Landing';
import Platform from './pages/Platform';
import Medications from './pages/Medications';
import Onboarding from './pages/Onboarding';
import Pricing from './pages/Pricing';
import Privacy from './pages/Privacy';
import Profiles from './pages/Profiles';
import PublicShare from './pages/PublicShare';
import Settings from './pages/Settings';
import Share from './pages/Share';
import Solutions from './pages/Solutions';
import Telehealth from './pages/Telehealth';
import Terms from './pages/Terms';
import Trends from './pages/Trends';
import TrustCenter from './pages/TrustCenter';
import UserAnalytics from './pages/UserAnalytics';
import Vitals from './pages/Vitals';
import DevDocs from './pages/DevDocs';
import WellnessGoals from './pages/WellnessGoals';
import WellnessHub from './pages/WellnessHub';
import WellnessInsights from './pages/WellnessInsights';
import Subscription from './pages/Subscription';
import MarketingHome from './pages/MarketingHome';


export const PAGES = {
    "ABHASettings": ABHASettings,
    "AIMedicalImaging": AIMedicalImaging,
    "SkinAssessment": SkinAssessment,
    "PersonalizedDiet": PersonalizedDiet,
    "AIAssistant": AIAssistant,
    "AIHealthCoach": AIHealthCoach,
    "AIHealthReports": AIHealthReports,
    "AIHub": AIHub,
    "AccountHub": AccountHub,
    "AdminAIOps": AdminAIOps,
    "AdminAds": AdminAds,
    "AdminAnalytics": AdminAnalytics,
    "AdminAssistant": AdminAssistant,
    "AdminDashboard": AdminDashboard,
    "AdminDocuments": AdminDocuments,
    "AdminFeatureFlags": AdminFeatureFlags,
    "AdminInsights": AdminInsights,
    "AdminIntegrations": AdminIntegrations,
    "AdminLogin": AdminLogin,
    "AdminMedications": AdminMedications,
    "AdminNotifications": AdminNotifications,
    "AdminPackages": AdminPackages,
    "AdminProfiles": AdminProfiles,
    "AdminRoles": AdminRoles,
    "AdminSubscriptions": AdminSubscriptions,
    "AdminUsers": AdminUsers,
    "AdminVitals": AdminVitals,
    "CareCircle": CareCircle,
    "CareHub": CareHub,
    "Dashboard": Dashboard,
    "Demo": Demo,
    "Documents": Documents,
    "EmergencyProfile": EmergencyProfile,
    "ExportReports": ExportReports,
    "GamificationDashboard": GamificationDashboard,
    "HealthHub": HealthHub,
    "Nutrition": Nutrition,
    "Home": Home,
    "Insights": Insights,
    "LabResults": LabResults,
    "Landing": Landing,
    "Platform": Platform,
    "Medications": Medications,
    "Onboarding": Onboarding,
    "Pricing": Pricing,
    "Privacy": Privacy,
    "Profiles": Profiles,
    "PublicShare": PublicShare,
    "Settings": Settings,
    "Share": Share,
    "Solutions": Solutions,
    "Telehealth": Telehealth,
    "Terms": Terms,
    "Trends": Trends,
    "TrustCenter": TrustCenter,
    "UserAnalytics": UserAnalytics,
    "Vitals": Vitals,
    "DevDocs": DevDocs,
    "WellnessGoals": WellnessGoals,
    "WellnessHub": WellnessHub,
    "WellnessInsights": WellnessInsights,
    "Subscription": Subscription,
    "MarketingHome": MarketingHome,
}

export const pagesConfig = {
    mainPage: "Landing",
    Pages: PAGES,
};
