const toBool = (value?: string) => value === 'true' || value === '1';

const LOCAL_ONLY = toBool(import.meta.env.VITE_LOCAL_ONLY);
const GITHUB_PAGES = toBool(import.meta.env.VITE_GITHUB_PAGES);
const USE_HASH_ROUTER = !LOCAL_ONLY && (toBool(import.meta.env.VITE_USE_HASH_ROUTER) || GITHUB_PAGES);
const API_URL = import.meta.env.VITE_API_URL || '';
const BASE_PATH = import.meta.env.BASE_URL || '/';

export const config = {
  API_URL,
  APP_NAME: 'SecureGist',
  MAX_FILE_SIZE_MB: 5,
  LOCAL_ONLY,
  BACKEND_ENABLED: !LOCAL_ONLY,
  USE_HASH_ROUTER,
  BASE_PATH,
};
