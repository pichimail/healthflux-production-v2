import { getRoutePath } from "@/lib/routes";

export function createPageUrl(pageName: string) {
    return getRoutePath(pageName);
}
