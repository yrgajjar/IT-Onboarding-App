
import { User, Asset, Complaint, UserRole, AdminRole, AssetStatus, AssetHistory, AssetService, ServiceStatus, AuditLog, AppSettings, ComplaintStatus, UserPermissions, UserAlert, UserReminder, AlertReadStatus, AssetUsage, ByodEntry, ChatMessage } from '../types';

const STORAGE_KEYS = {
  USERS: 'it_app_users',
  ASSETS: 'it_app_assets',
  COMPLAINTS: 'it_app_complaints',
  HISTORY: 'it_app_history',
  SERVICES: 'it_app_services',
  AUDIT_LOGS: 'it_app_audit_logs',
  SETTINGS: 'it_app_settings',
  ALERTS: 'it_app_alerts',
  REMINDERS: 'it_app_reminders',
  ALERT_READ_STATUS: 'it_app_alert_read_status',
  BYOD: 'it_app_byod_entries',
  MESSAGES: 'it_app_chat_messages'
};

const FULL_PERMISSIONS: UserPermissions = {
  dashboard: { read: true, write: true, update: true },
  employees: { read: true, write: true, update: true },
  assets: { read: true, write: true, update: true },
  mouse: { read: true, write: true, update: true },
  accessories: { read: true, write: true, update: true },
  services: { read: true, write: true, update: true },
  complaints: { read: true, write: true, update: true },
  calendar: { read: true, write: true, update: true },
  tools_manager: { read: true, write: true, update: true },
  admin: { read: true, write: true, update: true },
  rar: { read: true, write: true, update: true },
  settings: { read: true, write: true, update: true },
  alerts: { read: true, write: true, update: true },
  reminders: { read: true, write: true, update: true },
  byod: { read: true, write: true, update: true },
  chat: { read: true, write: true, update: true }
};

const DEFAULT_SETTINGS: AppSettings = {
  depreciationRate: 2.77,
  currencySymbol: '₹',
  isDepreciationEnabled: true,
  roundToNearestInteger: true,
  minAssetValueThreshold: 500,
  autoMarkEWaste: false,
  
  defaultAssetStatus: AssetStatus.SPARE,
  defaultComplaintStatus: ComplaintStatus.NEW,
  slaDays: 3,
  highlightSlaBreach: true,
  autoCreateServiceOnClose: true,
  allowClosureWithoutService: false,

  maintenanceMode: false,
  holidaySettings: {
    startDate: '',
    endDate: '',
    message: 'System operating with limited support during holiday season.',
    enabled: false
  },

  showCleanupGuides: true,
  showSoftwareTools: true,
  helpGuides: [
    {
      id: 'guide-1',
      title: 'Cleanup Guide (Windows)',
      steps: [
        'Press Win + R, type %temp% and hit Enter. Delete all files in the folder.',
        'Press Win + R, type temp and hit Enter. Delete all files.',
        'Press Win + R, type prefetch and hit Enter. Delete all files.',
        'Empty the Recycle Bin and restart your machine.'
      ],
      warning: 'Warning: Never delete files inside System32 or program folders unless explicitly instructed by IT.',
      isActive: true
    }
  ],
  softwareTools: [
    { id: 'tool-1', name: 'Company VPN Client', description: 'Secure connection to internal servers.', isEnabled: true },
    { id: 'tool-2', name: 'Antivirus Scanner', description: 'Perform manual deep scans if needed.', isEnabled: true },
    { id: 'tool-3', name: 'Remote Desktop Support', description: 'Allow IT to assist you remotely.', isEnabled: true }
  ],

  allowEmployeePasswordChange: true,
  allowEmployeeEmailChange: false,
  allowProfilePictureUpdate: false,
  allowNameChange: true,
  allowRaiseComplaint: true,
  allowViewAssetValue: false,
  allowDownloadReports: false,

  enableNotifications: true,
  notifyOnStatusChange: true,
  notifyOnAssignment: true,
  adminEmailForNotifications: 'admin@company.com',

  maxLoginAttempts: 5,
  sessionTimeoutMinutes: 30,
  allowAdminEmailChange: true,
  deletionMode: 'SOFT',
  forcePasswordChangeAfterReset: true,

  lastUpdated: new Date().toISOString()
};

const INITIAL_USERS: User[] = [
  { 
    id: 'admin-1', 
    name: 'IT Administrator', 
    email: 'admin@company.com', 
    password: 'admin123',
    role: UserRole.ADMIN, 
    adminRole: AdminRole.SUPER_ADMIN, 
    permissions: FULL_PERMISSIONS,
    assetUsage: AssetUsage.COMPANY,
    isActive: true, 
    employeeId: 'ADM-001', 
    mobile: '9999999999', 
    createdAt: new Date().toISOString() 
  },
  { 
    id: 'emp-169', 
    name: 'Yagnesh Gajjar', 
    email: 'me@yags.in', 
    password: 'admin123', 
    role: UserRole.EMPLOYEE, 
    assetUsage: AssetUsage.COMPANY, 
    isActive: true, 
    employeeId: '169', 
    mobile: '9099996398', 
    location: 'Bangalore', 
    department: 'Technology',
    createdAt: new Date().toISOString() 
  }
];

const INITIAL_ASSETS: Asset[] = [
  { id: 'ast-1', assetCode: 'LAP-001', assetType: 'Laptop', brand: 'Apple', model: 'MacBook Pro M2', serialNumber: 'SN123456', status: AssetStatus.ASSIGNED, inventoryCategory: 'ASSET', purchaseDate: '2023-01-01', purchaseValue: 150000, assignedTo: 'emp-169', totalServices: 0, openServices: 0, closedServices: 0 }
];

export const db = {
  getSettings: (): AppSettings => {
    const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
      return DEFAULT_SETTINGS;
    }
    return JSON.parse(data);
  },
  saveSettings: (settings: AppSettings, performedBy: User) => {
    const oldSettings = db.getSettings();
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));

    Object.keys(settings).forEach((key) => {
      const typedKey = key as keyof AppSettings;
      if (JSON.stringify(settings[typedKey]) !== JSON.stringify(oldSettings[typedKey]) && key !== 'lastUpdated') {
        db.addAuditLog({
          action: 'SETTING_CHANGE',
          performedBy: performedBy.id,
          performedByName: performedBy.name,
          details: `Changed ${key}: "${JSON.stringify(oldSettings[typedKey])}" -> "${JSON.stringify(settings[typedKey])}"`
        });
      }
    });
  },

  isHolidayActive: (): boolean => {
    const settings = db.getSettings();
    if (!settings.holidaySettings.enabled) return false;
    const now = new Date();
    const start = new Date(settings.holidaySettings.startDate);
    const end = new Date(settings.holidaySettings.endDate);
    return now >= start && now <= end;
  },

  getUsers: (): User[] => {
    const data = localStorage.getItem(STORAGE_KEYS.USERS);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
      return INITIAL_USERS;
    }
    const users: User[] = JSON.parse(data);
    return users.map(u => {
      if (!u.assetUsage) u.assetUsage = AssetUsage.COMPANY;
      if (u.id === 'admin-1') {
        return { 
          ...u, 
          adminRole: AdminRole.SUPER_ADMIN,
          permissions: u.permissions || FULL_PERMISSIONS 
        };
      }
      return u;
    });
  },
  saveUsers: (users: User[]) => localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users)),

  updateLastActive: (userId: string) => {
    const users = db.getUsers();
    const updated = users.map(u => u.id === userId ? { ...u, lastActive: new Date().toISOString() } : u);
    db.saveUsers(updated);
  },

  isUserOnline: (user?: User): boolean => {
    if (!user || !user.lastActive) return false;
    const lastActive = new Date(user.lastActive).getTime();
    const now = new Date().getTime();
    // Consider online if active in last 30 seconds
    return (now - lastActive) < 30000;
  },

  getAssets: (): Asset[] => {
    const data = localStorage.getItem(STORAGE_KEYS.ASSETS);
    if (!data) {
      localStorage.setItem(STORAGE_KEYS.ASSETS, JSON.stringify(INITIAL_ASSETS));
      return INITIAL_ASSETS;
    }
    const parsed: Asset[] = JSON.parse(data);
    return parsed.map(a => ({
      ...a,
      inventoryCategory: a.inventoryCategory || 'ASSET'
    }));
  },
  saveAssets: (assets: Asset[]) => localStorage.setItem(STORAGE_KEYS.ASSETS, JSON.stringify(assets)),

  getComplaints: (): Complaint[] => {
    const data = localStorage.getItem(STORAGE_KEYS.COMPLAINTS);
    return data ? JSON.parse(data) : [];
  },
  saveComplaints: (complaints: Complaint[]) => localStorage.setItem(STORAGE_KEYS.COMPLAINTS, JSON.stringify(complaints)),

  getHistory: (): AssetHistory[] => {
    const data = localStorage.getItem(STORAGE_KEYS.HISTORY);
    return data ? JSON.parse(data) : [];
  },
  saveHistory: (history: AssetHistory[]) => localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history)),

  getServices: (): AssetService[] => {
    const data = localStorage.getItem(STORAGE_KEYS.SERVICES);
    return data ? JSON.parse(data) : [];
  },
  saveServices: (services: AssetService[]) => {
    localStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify(services));
    db.syncAssetServiceCounters(services);
  },

  syncAssetServiceCounters: (services: AssetService[]) => {
    const assets = db.getAssets();
    const updatedAssets = assets.map(asset => {
      const assetServices = services.filter(s => s.assetId === asset.id || s.assetCode === asset.assetCode);
      return {
        ...asset,
        totalServices: assetServices.length,
        openServices: assetServices.filter(s => s.status === ServiceStatus.UNCOMPLETED_PENDING).length,
        closedServices: assetServices.filter(s => s.status === ServiceStatus.COMPLETED_CLOSED).length
      };
    });
    localStorage.setItem(STORAGE_KEYS.ASSETS, JSON.stringify(updatedAssets));
  },

  getAuditLogs: (): AuditLog[] => {
    const data = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
    return data ? JSON.parse(data) : [];
  },
  addAuditLog: (log: Omit<AuditLog, 'id' | 'timestamp'>) => {
    const logs = db.getAuditLogs();
    const newLog: AuditLog = {
      ...log,
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify([newLog, ...logs].slice(0, 500)));
  },

  getAlerts: (): UserAlert[] => {
    const data = localStorage.getItem(STORAGE_KEYS.ALERTS);
    return data ? JSON.parse(data) : [];
  },
  saveAlerts: (alerts: UserAlert[]) => localStorage.setItem(STORAGE_KEYS.ALERTS, JSON.stringify(alerts)),

  getAlertReadStatuses: (): AlertReadStatus[] => {
    const data = localStorage.getItem(STORAGE_KEYS.ALERT_READ_STATUS);
    return data ? JSON.parse(data) : [];
  },
  saveAlertReadStatuses: (statuses: AlertReadStatus[]) => localStorage.setItem(STORAGE_KEYS.ALERT_READ_STATUS, JSON.stringify(statuses)),

  getReminders: (): UserReminder[] => {
    const data = localStorage.getItem(STORAGE_KEYS.REMINDERS);
    return data ? JSON.parse(data) : [];
  },
  saveReminders: (reminders: UserReminder[]) => localStorage.setItem(STORAGE_KEYS.REMINDERS, JSON.stringify(reminders)),

  getByodEntries: (): ByodEntry[] => {
    const data = localStorage.getItem(STORAGE_KEYS.BYOD);
    return data ? JSON.parse(data) : [];
  },
  saveByodEntries: (entries: ByodEntry[]) => localStorage.setItem(STORAGE_KEYS.BYOD, JSON.stringify(entries)),

  getMessages: (): ChatMessage[] => {
    const data = localStorage.getItem(STORAGE_KEYS.MESSAGES);
    return data ? JSON.parse(data) : [];
  },
  saveMessages: (msgs: ChatMessage[]) => localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(msgs)),

  calculateAssetValue: (asset: Asset, settings: AppSettings) => {
    if (!settings.isDepreciationEnabled) return asset.purchaseValue;
    const purchaseDate = new Date(asset.purchaseDate);
    const now = new Date();
    const monthsDiff = (now.getFullYear() - purchaseDate.getFullYear()) * 12 + (now.getMonth() - purchaseDate.getMonth());
    const totalDepreciation = (asset.purchaseValue * (settings.depreciationRate / 100)) * monthsDiff;
    let currentValue = asset.purchaseValue - totalDepreciation;
    if (currentValue < 0) currentValue = 0;
    return settings.roundToNearestInteger ? Math.round(currentValue) : Number(currentValue.toFixed(2));
  },

  getAssetAgeInMonths: (purchaseDateStr: string) => {
    const purchaseDate = new Date(purchaseDateStr);
    const now = new Date();
    return (now.getFullYear() - purchaseDate.getFullYear()) * 12 + (now.getMonth() - purchaseDate.getMonth());
  }
};
