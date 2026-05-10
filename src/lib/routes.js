const kebab = (value) =>
  value
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/_/g, "-")
    .toLowerCase();

const route = (id, path, options = {}) => ({
  id,
  path,
  component: null, // resolved lazily via getRouteById after pagesConfig loads
  requiresAuth: options.requiresAuth ?? true,
  requiresAdmin: options.requiresAdmin ?? false,
  featureKey: options.featureKey ?? null,
  tabGroup: options.tabGroup ?? null,
  legacyPaths: options.legacyPaths ?? [`/${id}`],
});

// Late-bind page components to break circular dependency
let _Pages = null;
export function bindPages(Pages) {
  _Pages = Pages;
  for (const r of routeRegistry) {
    r.component = Pages[r.id] ?? null;
  }
}

export const routeRegistry = [
  route("MarketingHome", "/", { requiresAuth: false, legacyPaths: ["/MarketingHome", "/Landing"] }),
  route("Platform", "/platform", { requiresAuth: false, legacyPaths: ["/Platform"] }),
  route("Solutions", "/solutions", { requiresAuth: false, legacyPaths: ["/Solutions"] }),
  route("TrustCenter", "/trust", { requiresAuth: false, legacyPaths: ["/TrustCenter"] }),
  route("Pricing", "/pricing", { requiresAuth: false, legacyPaths: ["/Pricing"] }),
  route("DevDocs", "/dev-docs", { requiresAuth: false, legacyPaths: ["/DevDocs"] }),
  route("Terms", "/terms", { requiresAuth: false, legacyPaths: ["/Terms"] }),
  route("Privacy", "/privacy", { requiresAuth: false, legacyPaths: ["/Privacy"] }),
  route("Onboarding", "/onboarding"),
  route("Dashboard", "/dashboard", { tabGroup: "root", legacyPaths: ["/Dashboard"] }),
  route("HealthHub", "/health", { tabGroup: "root", legacyPaths: ["/HealthHub"] }),
  route("AIHub", "/ai", { tabGroup: "root", legacyPaths: ["/AIHub"] }),
  route("WellnessHub", "/wellness", { tabGroup: "root", legacyPaths: ["/WellnessHub"] }),
  route("CareHub", "/care", { tabGroup: "root", legacyPaths: ["/CareHub"] }),
  route("AccountHub", "/account", { tabGroup: "root", legacyPaths: ["/AccountHub"] }),
  route("Documents", "/documents", { legacyPaths: ["/Documents"] }),
  route("Nutrition", "/nutrition", { legacyPaths: ["/Nutrition"] }),
  route("Insights", "/insights", { legacyPaths: ["/Insights"] }),
  route("Vitals", "/vitals", { legacyPaths: ["/Vitals"] }),
  route("LabResults", "/lab-results", { legacyPaths: ["/LabResults"] }),
  route("Medications", "/medications", { legacyPaths: ["/Medications"] }),
  route("Trends", "/trends", { legacyPaths: ["/Trends"] }),
  route("Profiles", "/profiles", { legacyPaths: ["/Profiles"] }),
  route("Settings", "/settings", { legacyPaths: ["/Settings"] }),
  route("CareCircle", "/care-circle", { legacyPaths: ["/CareCircle"] }),
  route("WellnessGoals", "/wellness-goals", { legacyPaths: ["/WellnessGoals"] }),
  route("WellnessInsights", "/wellness-insights", { legacyPaths: ["/WellnessInsights"] }),
  route("AIAssistant", "/ai-assistant", { legacyPaths: ["/AIAssistant"] }),
  route("AIHealthCoach", "/ai-health-coach", { legacyPaths: ["/AIHealthCoach"] }),
  route("AIHealthReports", "/ai-health-reports", { legacyPaths: ["/AIHealthReports"] }),
  route("ABHASettings", "/abha-settings", { legacyPaths: ["/ABHASettings"] }),
  route("AIMedicalImaging", "/ai-medical-imaging", { legacyPaths: ["/AIMedicalImaging"] }),
  route("SkinAssessment", "/skin-assessment", { legacyPaths: ["/SkinAssessment"] }),
  route("PersonalizedDiet", "/personalized-diet", { legacyPaths: ["/PersonalizedDiet"] }),
  route("EmergencyProfile", "/emergency-profile", { legacyPaths: ["/EmergencyProfile"] }),
  route("Telehealth", "/telehealth", { legacyPaths: ["/Telehealth"] }),
  route("Share", "/share", { legacyPaths: ["/Share"] }),
  route("PublicShare", "/public-share", {
    requiresAuth: false,
    legacyPaths: ["/PublicShare"],
  }),
  route("ExportReports", "/export-reports", { legacyPaths: ["/ExportReports"] }),
  route("GamificationDashboard", "/rewards", { legacyPaths: ["/GamificationDashboard"] }),
  route("UserAnalytics", "/user-analytics", { legacyPaths: ["/UserAnalytics"] }),
  route("AdminLogin", "/admin/login", { requiresAuth: false, legacyPaths: ["/AdminLogin"] }),
  route("AdminDashboard", "/admin/dashboard", { requiresAdmin: true, legacyPaths: ["/AdminDashboard"] }),
  route("AdminUsers", "/admin/users", { requiresAdmin: true, legacyPaths: ["/AdminUsers"] }),
  route("AdminRoles", "/admin/roles", { requiresAdmin: true, legacyPaths: ["/AdminRoles"] }),
  route("AdminPackages", "/admin/packages", { requiresAdmin: true, legacyPaths: ["/AdminPackages"] }),
  route("AdminNotifications", "/admin/notifications", {
    requiresAdmin: true,
    legacyPaths: ["/AdminNotifications"],
  }),
  route("AdminFeatureFlags", "/admin/feature-flags", {
    requiresAdmin: true,
    legacyPaths: ["/AdminFeatureFlags"],
  }),
  route("AdminAnalytics", "/admin/analytics", { requiresAdmin: true, legacyPaths: ["/AdminAnalytics"] }),
  route("AdminAIOps", "/admin/ai-ops", { requiresAdmin: true, legacyPaths: ["/AdminAIOps"] }),
  route("AdminIntegrations", "/admin/integrations", {
    requiresAdmin: true,
    legacyPaths: ["/AdminIntegrations"],
  }),
  route("AdminDocuments", "/admin/documents", { requiresAdmin: true, legacyPaths: ["/AdminDocuments"] }),
  route("AdminVitals", "/admin/vitals", { requiresAdmin: true, legacyPaths: ["/AdminVitals"] }),
  route("AdminInsights", "/admin/insights", { requiresAdmin: true, legacyPaths: ["/AdminInsights"] }),
  route("AdminMedications", "/admin/medications", {
    requiresAdmin: true,
    legacyPaths: ["/AdminMedications"],
  }),
  route("AdminProfiles", "/admin/profiles", { requiresAdmin: true, legacyPaths: ["/AdminProfiles"] }),
  route("AdminAssistant", "/admin/assistant", { requiresAdmin: true, legacyPaths: ["/AdminAssistant"] }),
  route("AdminSubscriptions", "/admin/subscriptions", {
    requiresAdmin: true,
    legacyPaths: ["/AdminSubscriptions"],
  }),
  route("AdminAds", "/admin/ads", { requiresAdmin: true, legacyPaths: ["/AdminAds"] }),
  route("Subscription", "/subscription", { legacyPaths: ["/Subscription"] }),
];

export const defaultAuthenticatedRoute = "/dashboard";

export const getRouteById = (id) => routeRegistry.find((routeItem) => routeItem.id === id) ?? null;

export const getRoutePath = (id) => getRouteById(id)?.path ?? `/${kebab(id)}`;

export const getRouteByPath = (pathname) => {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  return (
    routeRegistry.find(
      (routeItem) =>
        routeItem.path === normalized || routeItem.legacyPaths.includes(normalized)
    ) ?? null
  );
};

export const getRouteIdByPath = (pathname) => getRouteByPath(pathname)?.id ?? null;

export const rootRouteIds = ["Dashboard", "HealthHub", "AIHub", "WellnessHub", "CareHub", "AccountHub"];

export const rootRoutePaths = rootRouteIds.map(getRoutePath);