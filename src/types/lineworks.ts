export interface InstallationLineWorks {
  access_token: string;
  refresh_token: string;
  scope: string;
  token_type: string;
  expires_in: string;
}

export interface AuthLineWorksResponse {
  access_token: string;
  refresh_token?: string;
  scope: string;
  token_type: string;
  expires_in: string;
}

export interface UsersResponse {
  users: User[];
  responseMetaData: ResponseMetaData;
}

export interface User {
  domainId: number;
  userId: string;
  userExternalKey: string;
  isAdministrator: boolean;
  isPending: boolean;
  isSuspended: boolean;
  isDeleted: boolean;
  suspendedReason: any;
  email: string;
  userName: UserName;
  i18nName: any[];
  nickName: string;
  privateEmail: string;
  aliasEmails: any[];
  employmentTypeId: any;
  employmentTypeName: any;
  searchable: boolean;
  organizations: Organization[];
  telephone: string;
  cellPhone: string;
  location: string;
  task: string;
  messenger: Messenger;
  birthdayCalendarType: string;
  birthday: string;
  locale: string;
  hiredDate: string;
  timeZone: string;
  leaveOfAbsence: LeaveOfAbsence;
  customFields: CustomField[];
  relations: Relation[];
}

export interface UserName {
  lastName: string;
  firstName: string;
  phoneticLastName: any;
  phoneticFirstName: any;
}

export interface Organization {
  domainId: number;
  primary: boolean;
  userExternalKey: any;
  email: string;
  levelId: string;
  levelExternalKey: any;
  levelName: string;
  executive: boolean;
  organizationName: string;
  orgUnits: OrgUnit[];
}

export interface OrgUnit {
  orgUnitId: string;
  orgUnitExternalKey: any;
  orgUnitEmail: string;
  orgUnitName: string;
  primary: boolean;
  positionId: string;
  positionExternalKey: any;
  positionName: string;
  isManager: boolean;
  visible: boolean;
  useTeamFeature: boolean;
}

export interface Messenger {
  protocol: string;
  messengerId: string;
}

export interface LeaveOfAbsence {
  startTime: any;
  endTime: any;
  isLeaveOfAbsence: boolean;
}

export interface CustomField {
  customFieldId: string;
  value: string;
  link: any;
}

export interface Relation {
  relationUserId: string;
  relationName: string;
  externalKey: string;
}

export interface ResponseMetaData {
  nextCursor: string;
  users: User[]
  responseMetaData: ResponseMetaData
}

export interface User {
  domainId: number
  userId: string
  userExternalKey: string
  isAdministrator: boolean
  isPending: boolean
  isSuspended: boolean
  isDeleted: boolean
  suspendedReason: any
  email: string
  userName: UserName
  i18nName: any[]
  nickName: string
  privateEmail: string
  aliasEmails: any[]
  employmentTypeId: any
  employmentTypeName: any
  searchable: boolean
  organizations: Organization[]
  telephone: string
  cellPhone: string
  location: string
  task: string
  messenger: Messenger
  birthdayCalendarType: string
  birthday: string
  locale: string
  hiredDate: string
  timeZone: string
  leaveOfAbsence: LeaveOfAbsence
  customFields: CustomField[]
  relations: Relation[]
}

export interface UserName {
  lastName: string
  firstName: string
  phoneticLastName: any
  phoneticFirstName: any
}

export interface Organization {
  domainId: number
  primary: boolean
  userExternalKey: any
  email: string
  levelId: string
  levelExternalKey: any
  levelName: string
  executive: boolean
  organizationName: string
  orgUnits: OrgUnit[]
}

export interface OrgUnit {
  orgUnitId: string
  orgUnitExternalKey: any
  orgUnitEmail: string
  orgUnitName: string
  primary: boolean
  positionId: string
  positionExternalKey: any
  positionName: string
  isManager: boolean
  visible: boolean
  useTeamFeature: boolean
}

export interface Messenger {
  protocol: string
  messengerId: string
}

export interface LeaveOfAbsence {
  startTime: any
  endTime: any
  isLeaveOfAbsence: boolean
}

export interface CustomField {
  customFieldId: string
  value: string
  link: any
}

export interface Relation {
  relationUserId: string
  relationName: string
  externalKey: string
}

export interface ResponseMetaData {
  nextCursor: string
}


// Group list API
export interface GroupsResponse {
  groups: Group[];
  responseMetaData: ResponseMetaData;
}

export interface Group {
  domainId: number;
  groupId: string;
  groupName: string;
  description?: string;
  visible: boolean;
  useServiceNotification: boolean;
  serviceManageable: boolean;
  groupExternalKey: string;
  administrators: Administrator[];
  members: Member[];
  useMessage: boolean;
  useNote: boolean;
  useCalendar: boolean;
  useFolder: boolean;
  useTask: boolean;
  useMail: boolean;
  groupEmail: string;
  aliasEmails: string[];
  canReceiveExternalMail: boolean;
  toExternalEmails?: string[];
  membersAllowedToUseGroupEmailAsRecipient?: MembersAllowedToUseGroupEmailAsRecipient[];
  membersAllowedToUseGroupEmailAsSender?: MembersAllowedToUseGroupEmailAsSender[];
}

export interface Administrator {
  userExternalKey: string;
  userId: string;
}

export interface Member {
  externalKey: string;
  id: string;
  type: string;
}

export interface MembersAllowedToUseGroupEmailAsRecipient {
  userExternalKey: string;
  userId: string;
}

export interface MembersAllowedToUseGroupEmailAsSender {
  userExternalKey: string;
  userId: string;
}

export interface ResponseMetaData {
  nextCursor: string;
}

export interface LineWorksMessage {
  content: any;
}

export interface LineWorksContent {
  type: string;
  layout?: "horizontal" | "vertical" | "baseline" | string;
  contents?: LineWorksContent[] | LineWorksContent;
  text?: string;
  size?: string;
  color?: string;
  weight?: string;
  wrap?: boolean;
  paddingTop?: string;
  paddingBottom?: string;
  flex?: number;
  gravity?: string;
  action?: {
    type: "uri" | "message" | "text" | "postback" | string;
    uri?: string;
  };
  altText?: string;
  body?: LineWorksContent;
  url?: string;
  offsetTop?: string;
  spacing?: string;
}

// api/channel response
export type ChannelResponse = {
  domainID?:    number;
  channelID?:   string;
  title?:       string;
  channelType?: ChannelType;
  code?:        string;
  description?: string;
}

export type ChannelType = {
  type?:    string;
  groupID?: string;
}

export type ChannelMembersResponse = {
  members:          string[];
  responseMetaData: ResponseMetaData;
  code?:        string;
  description?: string;
}


//api/bots response
export type BotsResponse = {
  bots:             Bot[];
  responseMetaData: ResponseMetaData;
}

export type Bot = {
  botId:         string;
  botName:       string;
  photoURL:      string;
  i18NBotNames:  any[];
  i18NPhotoUrls: any[];
}

// api/bot detail response
export type BotResponse = {
  botId:             string;
  botName:           string;
  photoURL:          string;
  enableCallback:    boolean;
  callbackURL:       string;
  callbackEvents:    any[];
  createdTime:       Date;
  modifiedTime:      Date;
  description:       string;
  administrators:    string[];
  subadministrators: any[];
  enableGroupJoin:   boolean;
  allowDomains:      number[];
  i18NBotNames:      any[];
  i18NPhotoUrls:     any[];
  i18NDescriptions:  any[];
  defaultRichmenuID: null;
}
