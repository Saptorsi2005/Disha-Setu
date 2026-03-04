/**
 * services/analyticsService.js
 * Analytics API calls
 */
import { apiFetch } from './api';

export const fetchDistrictAnalytics = async () => {
    return apiFetch('/analytics/district');
};
