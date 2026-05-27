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
  route("Auth", "/auth", { requiresAuth: false, legacyPaths: ["/Auth"] }),
  route("Onboarding", "/onboarding"),
  route("Dashboard", "/dashboard", { tabGroup: "root", legacyPaths: ["/Dashboard"] }),
  route("HealthHub", "/health", { tabGroup: "root", legacyPaths: ["/HealthHub"] }),
  route("AIHub", "/ai", { tabGroup: "root", legacyPaths: ["/AIHub"] }),
  route("WellnessHub", "/wellness", { tabGroup: "root", legacyPaths: ["/WellnessHub"] }),
  route("CareHub", "/care", { tabGroup: "root", legacyPaths: ["/CareHub"] }),
  route("AccountHub", "/account", { tabGroup: "root", legacyPaths: ["/AccountHub"] }),
  route("Documents", "/documents", { featureKey: "universal_upload", legacyPaths: ["/Documents"] }),
  route("Nutrition", "/nutrition", { legacyPaths: ["/Nutrition"] }),
  route("Insights", "/insights", { featureKey: "ai_insights_generate", legacyPaths: ["/Insights"] }),
  route("Vitals", "/vitals", { featureKey: "vitals_logging", legacyPaths: ["/Vitals"] }),
  route("LabResults", "/lab-results", { featureKey: "labs_module", legacyPaths: ["/LabResults"] }),
  route("Medications", "/medications", { featureKey: "meds_module", legacyPaths: ["/Medications"] }),
  route("Trends", "/trends", { featureKey: "user_analytics", legacyPaths: ["/Trends"] }),
  route("Profiles", "/profiles", { legacyPaths: ["/Profiles"] }),
  route("Settings", "/settings", { legacyPaths: ["/Settings"] }),
  route("CareCircle", "/care-circle", { featureKey: "care_circle", legacyPaths: ["/CareCircle"] }),
  route("WellnessGoals", "/wellness-goals", { featureKey: "wellness_goals_tracking", legacyPaths: ["/WellnessGoals"] }),
  route("WellnessInsights", "/wellness-insights", { featureKey: "wellness_goals_ai_feedback", legacyPaths: ["/WellnessInsights"] }),
  route("AIAssistant", "/ai-assistant", { featureKey: "triage_mode", legacyPaths: ["/AIAssistant"] }),
  route("AIHealthCoach", "/ai-health-coach", { featureKey: "coach_mode", legacyPaths: ["/AIHealthCoach"] }),
  route("AIHealthReports", "/ai-health-reports", { featureKey: "ai_health_reports", legacyPaths: ["/AIHealthReports"] }),
  route("ABHASettings", "/abha-settings", { featureKey: "abha_settings", legacyPaths: ["/ABHASettings"] }),
  route("AIMedicalImaging", "/ai-medical-imaging", { featureKey: "ai_medical_imaging", legacyPaths: ["/AIMedicalImaging"] }),
  route("SkinAssessment", "/skin-assessment", { featureKey: "skin_assessment", legacyPaths: ["/SkinAssessment"] }),
  route("PersonalizedDiet", "/personalized-diet", { featureKey: "personalized_diet_plan", legacyPaths: ["/PersonalizedDiet"] }),
  route("EmergencyProfile", "/emergency-profile", { featureKey: "emergency_profile", legacyPaths: ["/EmergencyProfile"] }),
  route("Telehealth", "/telehealth", { featureKey: "telehealth_browse", legacyPaths: ["/Telehealth"] }),
  route("Share", "/share", { featureKey: "share_links", legacyPaths: ["/Share"] }),
  route("PublicShare", "/public-share", {
    requiresAuth: false,
    legacyPaths: ["/PublicShare"],
  }),
  route("ExportReports", "/export-reports", { featureKey: "export_pdf", legacyPaths: ["/ExportReports"] }),
  route("GamificationDashboard", "/rewards", { featureKey: "gamification_dashboard", legacyPaths: ["/GamificationDashboard"] }),
  route("UserAnalytics", "/user-analytics", { featureKey: "user_analytics", legacyPaths: ["/UserAnalytics"] }),
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
  route("Payments", "/payments", { legacyPaths: ["/Payments"] }),
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
