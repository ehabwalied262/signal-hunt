export enum LeadStatus {
  NEW = 'NEW',
  CONTACTED = 'CONTACTED',
  INTERESTED = 'INTERESTED',
  NOT_INTERESTED = 'NOT_INTERESTED',
  WRONG_NUMBER = 'WRONG_NUMBER',
  CALLBACK_SCHEDULED = 'CALLBACK_SCHEDULED',
}

export interface Lead {
  id: string;
  companyName: string;
  contactName: string | null;
  contactTitle: string | null;
  phoneNumber: string;
  country: string | null;
  location: string | null;
  headcount: number | null;
  headcountGrowth6m: number | null;
  headcountGrowth12m: number | null;
  companyOverview: string | null;
  aiSummary: string | null;
  ownerId: string;
  status: LeadStatus;
  isWrongNumber: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LeadWithRelations extends Lead {
  owner: { id: string; fullName: string };
  _count: { calls: number };
}

export interface LeadFilters {
  search?: string;
  status?: LeadStatus;
  country?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
