import { getFeatureAvailability } from "@/services/availability";

export function getAdminAdsAvailability() {
  return getFeatureAvailability("adminAds");
}
