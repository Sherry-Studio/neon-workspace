/**
 * Mirrors the backend's optional Firebase Cloud Messaging toggle
 * (`FCM_ENABLED` in Neon-Arcade-Backend). When the real backend is wired in,
 * this status comes from `GET /notifications/push-status` instead.
 */
export function pushAvailable(): boolean {
  return process.env.FCM_ENABLED === "true";
}

export function pushProvider(): string {
  return pushAvailable() ? "Firebase Cloud Messaging" : "none";
}
