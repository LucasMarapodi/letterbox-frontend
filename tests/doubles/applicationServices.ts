import type { ApplicationServices } from '../../src/services/runtime';
import { createMockServices } from './services';
import { createMockGameService } from './gameService';
import { createMockNotificationService } from './notificationService';
/** Double composto exclusivamente para cenários de componentes legados. */
export function createTestApplicationServices(): ApplicationServices {
  const doubles = createMockServices();
  return { ...doubles, notifications: createMockNotificationService(), games: { ...createMockGameService(), getOpinions: (id) => doubles.community.getOpinions(id) } };
}
