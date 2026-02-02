
export enum UserRole {
  ADMIN = 'ADMIN',
  EMPLOYEE = 'EMPLOYEE'
}

export enum AdminRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  OPERATOR = 'OPERATOR',
  ASSETS_MANAGER = 'ASSETS_MANAGER',
  COMPLAINT_ASSISTANT = 'COMPLAINT_ASSISTANT'
}

export enum AssetUsage {
  COMPANY = 'TMA Assets',
  PERSONAL = 'Personal Laptop'
}

export enum EmployeeType {
  PERMANENT = 'Permanent',
  CONTRACT = 'Contract',
  INTERN = 'Intern'
}

export enum ByodStatus {
  ACTIVE = 'Active',
  RETRIEVED_BY_EMPLOYEE = 'BYOD Retrieved (Employee)',
  RETRIEVED_BY_ADMIN = 'BYOD Retrieved (Admin)',
  PENDING = 'Pending Submission',
  AWAITING_APPROVAL = 'Awaiting IT Approval',
  REJECTED = 'Rejected',
  INACTIVE_SWITCHED_TO_COMPANY = 'Inactive – Switched to Company Assets'
}

export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  timestamp: string;
  isRead: boolean;
}

export interface ByodEntry {
  id: string;
  userId: string;
  employeeName: string;
  employeeType: EmployeeType;
  employeeId?: string;
  department: string;
  email: string;
  phone: string;
  deviceType: 'Laptop' | 'Mobile' | 'Tablet' | 'Other';
  brand: string;
  model: string;
  serialNumber: string;
  osVersion: string;
  imeiMac: string;
  agreementAccepted: boolean;
  status: ByodStatus;
  createdAt: string;
  retrievedAt?: string;
  retrievalReason?: string;
  rejectionReason?: string;
  approvedAt?: string;
  approvedBy?: string;
}

export interface ModuleAccess {
  read: boolean;
  write: boolean;
  update: boolean;
}

export type InventoryCategory = 'ASSET' | 'MOUSE' | 'ACCESSORY';

export type ModuleName = 
  | 'dashboard' 
  | 'employees' 
  | 'assets' 
  | 'mouse'
  | 'accessories'
  | 'services' 
  | 'complaints' 
  | 'calendar' 
  | 'tools_manager' 
  | 'admin' 
  | 'rar' 
  | 'settings'
  | 'alerts'
  | 'reminders'
  | 'byod'
  | 'chat';

export interface UserPermissions {
  [key: string]: ModuleAccess;
}

export enum AssetStatus {
  ASSIGNED = 'Assigned',
  SPARE = 'Spare',
  READY_TO_USE = 'Ready to Use',
  PENDING_AUDIT = 'Pending Audit',
  UNDER_REPAIR = 'Under Repair',
  UNREPAIRABLE = 'Unrepairable',
  STOLEN = 'Stolen',
  MISSING = 'Missing',
  E_WASTE = 'E-Waste',
  REMOVED = 'Removed'
}

export enum ComplaintStatus {
  NEW = 'NEW',
  PENDING = 'PENDING',
  IN_PROCESS = 'IN_PROCESS',
  CANCELLED = 'CANCELLED',
  CLOSED = 'CLOSED'
}

export enum ServiceStatus {
  COMPLETED_CLOSED = 'Completed / Closed',
  UNCOMPLETED_PENDING = 'Uncompleted / Pending'
}

// --- Alerts & Reminders ---

export type AlertType = 'INFO' | 'WARNING' | 'CRITICAL';
export type AlertPriority = 'LOW' | 'MEDIUM' | 'HIGH';
export type AlertTarget = 'USER' | 'ROLE' | 'ALL';

export interface UserAlert {
  id: string;
  title: string;
  message: string;
  type: AlertType;
  targetType: AlertTarget;
  targetIds: string[]; // User IDs or Role Names
  validFrom: string;
  validTill: string;
  priority: AlertPriority;
  dismissible: boolean;
  createdBy: string;
  createdAt: string;
}

export interface AlertReadStatus {
  alertId: string;
  userId: string;
  readAt?: string;
  dismissed: boolean;
}

export type ReminderStatus = 'PENDING' | 'COMPLETED' | 'SNOOZED';
export type ReminderRepeat = 'NONE' | 'DAILY' | 'WEEKLY' | 'MONTHLY';

export interface UserReminder {
  id: string;
  title: string;
  description: string;
  assignedToIds: string[];
  date: string;
  time: string;
  repeat: ReminderRepeat;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  linkedModule?: 'ASSET' | 'COMPLAINT' | 'SERVICE' | 'GENERAL';
  status: ReminderStatus;
  overdue?: boolean;
  createdBy: string;
  createdAt: string;
}

// --- End Alerts & Reminders ---

export interface HelpGuide {
  id: string;
  title: string;
  steps: string[];
  warning?: string;
  isActive: boolean;
}

export interface SoftwareTool {
  id: string;
  name: string;
  description: string;
  downloadUrl?: string;
  isEnabled: boolean;
}

export interface AppSettings {
  // Financial
  depreciationRate: number; // Monthly %
  currencySymbol: string;
  isDepreciationEnabled: boolean;
  roundToNearestInteger: boolean;
  minAssetValueThreshold: number;
  autoMarkEWaste: boolean;

  // General & Workflow
  defaultAssetStatus: AssetStatus;
  defaultComplaintStatus: ComplaintStatus;
  slaDays: number;
  highlightSlaBreach: boolean;
  autoCreateServiceOnClose: boolean;
  allowClosureWithoutService: boolean;

  // System Modes
  maintenanceMode: boolean;
  holidaySettings: {
    startDate: string;
    endDate: string;
    message: string;
    enabled: boolean;
  };

  // Help & Tools Content
  showCleanupGuides: boolean;
  showSoftwareTools: boolean;
  helpGuides: HelpGuide[];
  softwareTools: SoftwareTool[];

  // Employee Behavior Controls
  allowEmployeePasswordChange: boolean;
  allowEmployeeEmailChange: boolean;
  allowProfilePictureUpdate: boolean;
  allowNameChange: boolean;
  allowRaiseComplaint: boolean;
  allowRaiseByodRequest?: boolean;
  allowViewAssetValue: boolean;
  allowDownloadReports: boolean;

  // Notifications
  enableNotifications: boolean;
  notifyOnStatusChange: boolean;
  notifyOnAssignment: boolean;
  adminEmailForNotifications: string;

  // Security
  maxLoginAttempts: number;
  sessionTimeoutMinutes: number;
  allowAdminEmailChange: boolean;
  deletionMode: 'SOFT' | 'HARD';
  forcePasswordChangeAfterReset: boolean;

  lastUpdated: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  mobile?: string;
  employeeId?: string;
  location?: string;
  department?: string;
  assetUsage: AssetUsage;
  password?: string;
  role: UserRole;
  adminRole?: AdminRole;
  permissions?: UserPermissions;
  isActive: boolean;
  isDeleted?: boolean;
  deleteReason?: string;
  deletedAt?: string;
  createdAt: string;
  lastUpdated?: string;
  lastActive?: string; // New: For presence tracking
  forcePasswordChange?: boolean;
  profilePicture?: string;
  createdBy?: string;
  createdByName?: string;
}

export interface AuditLog {
  id: string;
  action: string;
  performedBy: string;
  performedByName: string;
  targetId?: string; 
  targetName?: string;
  details: string;
  timestamp: string;
}

export interface AssetRemovalData {
  auditStatus: string;
  statusToCheck: string;
  adminRemovalDate: string;
  reason: string;
  approvedBy: string;
  conditionAtRemoval: string;
  valueAtRemoval: number;
  proofRef: string;
  remark: string;
  lastKnownUser?: string;
  lastKnownUserName?: string;
  removalTimestamp: string;
}

export interface Asset {
  id: string;
  assetCode: string;
  assetType: string;
  brand: string;
  model: string;
  serialNumber: string;
  status: AssetStatus;
  inventoryCategory: InventoryCategory;
  purchaseDate: string;
  purchaseValue: number;
  assignedTo?: string; 
  isSpareAssignment?: boolean;
  spareReturnDate?: string;
  lastServiceDate?: string;
  totalServices: number;
  openServices: number;
  closedServices: number;
  removalData?: AssetRemovalData;
}

export interface AssetService {
  id: string;
  userId: string;
  userName: string;
  assetId: string;
  assetCode: string;
  assetType: string;
  brand: string;
  model: string;
  serialNumber: string;
  monthOfTT: string;
  dateOfTT: string;
  dateOfClose?: string;
  category: string;
  subCategory: string;
  technicianName: string;
  summary: string;
  status: ServiceStatus;
  uncompletedRepairs: string;
  addedReplacedParts: string;
  partsCost: number;
  invoiceReference: string;
  conclusion: string;
  whatNext: string;
  createdAt: string;
}

export interface StatusHistoryItem {
  status: ComplaintStatus;
  timestamp: string;
  remarks?: string;
}

export interface Complaint {
  id: string;
  userId: string;
  assetCode: string;
  subject: string;
  message: string;
  status: ComplaintStatus;
  pendingReason?: string;
  statusHistory: StatusHistoryItem[];
  createdAt: string;
  appointmentStart?: string;
  appointmentEnd?: string;
}

export interface AssetHistory {
  id: string;
  assetId: string;
  userId: string;
  type: 'ASSIGNMENT' | 'REPLACEMENT' | 'RETURN';
  timestamp: string;
  note?: string;
}
