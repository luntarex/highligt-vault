import { LOCAL_API_BASE_URL, PRODUCTION_API_BASE_URL } from './api.generated';

export const API_BASE_URL =
  typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? LOCAL_API_BASE_URL
    : PRODUCTION_API_BASE_URL;
