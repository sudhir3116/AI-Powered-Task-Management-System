export const PLAN_LIMITS = {
  FREE: {
    maxMembers: 10,
    maxAiRequestsPerDay: 50,
    auditLogs: true,
    advancedAnalytics: true,
  },
  PRO: {
    maxMembers: 50,
    maxAiRequestsPerDay: 500,
    auditLogs: true,
    advancedAnalytics: true,
  },
  BUSINESS: {
    maxMembers: 250,
    maxAiRequestsPerDay: 2500,
    auditLogs: true,
    advancedAnalytics: true,
  },
  ENTERPRISE: {
    maxMembers: 10000,
    maxAiRequestsPerDay: 100000,
    auditLogs: true,
    advancedAnalytics: true,
  },
};

export const canUseFeature = (organization, feature) => {
  if (!organization) return true; // Default allow for safety
  const plan = organization.subscription?.plan || "FREE";
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.FREE;

  if (feature in limits) {
    return limits[feature];
  }
  return true;
};
