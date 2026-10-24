import { API_ROUTES } from '@cybergrid/shared/protocol';

export async function getHealth() {
  const response = await fetch(API_ROUTES.HEALTH);
  if (!response.ok) {
    throw new Error('HTTP ' + response.status);
  }
  return response.json();
}
