
// src/environments/environment.prod.ts
export const environment = {
  production: true,
  supabase: {
    url: 'https://hzbspfvatsnkhpizuojf.supabase.co',
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6YnNwZnZhdHNua2hwaXp1b2pmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM5NjkzNTMsImV4cCI6MjA1OTU0NTM1M30.26ZIIXbDbrpeLQcu0vYGQIn9eW6c-gi1-0it9ov2G1o',
  },
  app: {
    name: 'دار الزيبق للنشر والإنتاج',
    version: '1.0.0',
    defaultLanguage: 'ar',
    defaultCurrency: 'USD',
    dateFormat: 'dd/MM/yyyy',
  },
  features: {
    enableNotifications: true,
    enableFileUpload: true,
    maxFileSize: 10 * 1024 * 1024,
    allowedFileTypes: ['image/jpeg', 'image/png', 'application/pdf', 'application/zip'],
  },
  ui: {
    itemsPerPage: 20,
    debounceTime: 300,
  }
};
