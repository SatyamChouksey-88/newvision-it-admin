import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { LINE_ITEM_KINDS, PROCUREMENT_CATEGORIES, PROCUREMENT_TYPES } from './constants';

export class LineItemDto {
  @IsString()
  @MinLength(1)
  product!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unitCost!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  quantity!: number;

  @IsOptional()
  @IsString()
  commercialNotes?: string;

  @IsOptional()
  @IsIn([...LINE_ITEM_KINDS])
  kind?: (typeof LINE_ITEM_KINDS)[number];
}

export class QuoteDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  vendorId?: number;

  @IsOptional()
  @IsString()
  vendorName?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  quotedPrice!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  leadTimeDays?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  selected?: boolean;
}

export class VendorContactDto {
  @IsString()
  @MinLength(1)
  name!: string;

  @IsOptional()
  @IsString()
  roleTitle?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class CreateVendorDto {
  @IsString()
  @MinLength(2)
  legalName!: string;

  @IsOptional()
  @IsString()
  tradingName?: string;

  @IsOptional()
  @IsString()
  taxId?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  registeredAddress?: string;

  @IsOptional()
  @IsString()
  remitToAddress?: string;

  @IsOptional()
  @IsString()
  paymentTerms?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  bankAccountNumber?: string;

  @IsOptional()
  @IsString()
  bankIfscSwift?: string;

  @IsOptional()
  @IsString()
  defaultBudgetHead?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @IsOptional()
  @IsBoolean()
  isPreferred?: boolean;

  @IsOptional()
  @IsDateString()
  nextReviewDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  internalOwnerId?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VendorContactDto)
  contacts?: VendorContactDto[];
}

export class UpdateVendorDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  legalName?: string;

  @IsOptional()
  @IsString()
  tradingName?: string;

  @IsOptional()
  @IsString()
  taxId?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  registeredAddress?: string;

  @IsOptional()
  @IsString()
  remitToAddress?: string;

  @IsOptional()
  @IsString()
  paymentTerms?: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  bankAccountNumber?: string;

  @IsOptional()
  @IsString()
  bankIfscSwift?: string;

  @IsOptional()
  @IsString()
  defaultBudgetHead?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @IsOptional()
  @IsBoolean()
  isPreferred?: boolean;

  @IsOptional()
  @IsDateString()
  nextReviewDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  internalOwnerId?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VendorContactDto)
  contacts?: VendorContactDto[];
}

export class VendorStatusDto {
  @IsIn(['pending_approval', 'active', 'suspended', 'blacklisted', 'draft'])
  status!: 'pending_approval' | 'active' | 'suspended' | 'blacklisted' | 'draft';

  @IsString()
  @MinLength(3)
  reason!: string;
}

export class CreateRequisitionDto {
  @IsString()
  @MinLength(3)
  title!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  departmentId?: number;

  @IsOptional()
  @IsString()
  departmentFreeText?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  ownerEmployeeId?: number;

  @IsOptional()
  @IsDateString()
  requestDate?: string;

  @IsString()
  @MinLength(3)
  businessRequirement!: string;

  @IsOptional()
  @IsString()
  proposedMakeModel?: string;

  @IsIn([...PROCUREMENT_CATEGORIES])
  category!: (typeof PROCUREMENT_CATEGORIES)[number];

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => LineItemDto)
  lineItems!: LineItemDto[];

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  taxAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  totalCost?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  vendorId?: number;

  @IsOptional()
  @IsString()
  vendorFreeText?: string;

  @IsOptional()
  @IsString()
  budgetHead?: string;

  @IsIn([...PROCUREMENT_TYPES])
  procurementType!: (typeof PROCUREMENT_TYPES)[number];

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Type(() => Number)
  locationIds?: number[];

  @IsOptional()
  @IsBoolean()
  remoteEmployees?: boolean;

  @IsOptional()
  @IsString()
  locationFreeText?: string;

  @IsOptional()
  @IsDateString()
  expectedProcurementDate?: string;

  @IsOptional()
  @IsDateString()
  expectedDeploymentDate?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuoteDto)
  quotes?: QuoteDto[];

  @IsOptional()
  @IsBoolean()
  submit?: boolean;
}

export class UpdateRequisitionDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  title?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  departmentId?: number;

  @IsOptional()
  @IsString()
  departmentFreeText?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  ownerEmployeeId?: number;

  @IsOptional()
  @IsDateString()
  requestDate?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  businessRequirement?: string;

  @IsOptional()
  @IsString()
  proposedMakeModel?: string;

  @IsOptional()
  @IsIn([...PROCUREMENT_CATEGORIES])
  category?: (typeof PROCUREMENT_CATEGORIES)[number];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LineItemDto)
  lineItems?: LineItemDto[];

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  taxAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  totalCost?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  vendorId?: number;

  @IsOptional()
  @IsString()
  vendorFreeText?: string;

  @IsOptional()
  @IsString()
  budgetHead?: string;

  @IsOptional()
  @IsIn([...PROCUREMENT_TYPES])
  procurementType?: (typeof PROCUREMENT_TYPES)[number];

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Type(() => Number)
  locationIds?: number[];

  @IsOptional()
  @IsBoolean()
  remoteEmployees?: boolean;

  @IsOptional()
  @IsString()
  locationFreeText?: string;

  @IsOptional()
  @IsDateString()
  expectedProcurementDate?: string;

  @IsOptional()
  @IsDateString()
  expectedDeploymentDate?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuoteDto)
  quotes?: QuoteDto[];

  @IsOptional()
  @IsString()
  reason?: string;
}

export class ReasonDto {
  @IsString()
  @MinLength(3)
  reason!: string;
}

export class ApprovalDto {
  @IsIn(['approved', 'rejected'])
  decision!: 'approved' | 'rejected';

  @IsOptional()
  @IsString()
  comment?: string;
}

export class AmendPoDto {
  @IsString()
  @MinLength(3)
  reason!: string;

  @IsOptional()
  @IsDateString()
  deliveryDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  taxAmount?: number;

  @IsOptional()
  @IsString()
  terms?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LineItemDto)
  lineItems?: LineItemDto[];
}

export class ReceiveDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReceiptLineDto)
  lines!: ReceiptLineDto[];

  @IsOptional()
  @IsString()
  conditionNotes?: string;

  @IsOptional()
  @IsString()
  discrepancy?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  locationId?: number;
}

export class ReceiptLineDto {
  @Type(() => Number)
  @IsInt()
  purchaseOrderLineId!: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  quantityReceived!: number;
}

export class CreateInvoiceDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  purchaseOrderId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  contractId?: number;

  @Type(() => Number)
  @IsInt()
  vendorId!: number;

  @IsString()
  @MinLength(1)
  invoiceNumber!: string;

  @IsDateString()
  invoiceDate!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  amount!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  taxAmount?: number;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  exceptionNote?: string;
}

export class InvoicePaymentDto {
  @IsIn(['pending', 'approved', 'paid', 'overdue', 'disputed', 'cancelled'])
  paymentStatus!: 'pending' | 'approved' | 'paid' | 'overdue' | 'disputed' | 'cancelled';

  @IsOptional()
  @IsString()
  exceptionNote?: string;
}

export class CreateContractDto {
  @Type(() => Number)
  @IsInt()
  vendorId!: number;

  @IsIn(['warranty', 'amc', 'sla', 'license_subscription'])
  type!: 'warranty' | 'amc' | 'sla' | 'license_subscription';

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  value!: number;

  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  noticePeriodDays?: number;

  @IsOptional()
  @IsString()
  slaTerms?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  entitlementCount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  usageCount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  locationId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  ownerId?: number;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Type(() => Number)
  assetIds?: number[];
}

export class UpdateContractDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  value?: number;

  @IsOptional()
  @IsBoolean()
  autoRenew?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  noticePeriodDays?: number;

  @IsOptional()
  @IsString()
  slaTerms?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  entitlementCount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  usageCount?: number;

  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Type(() => Number)
  assetIds?: number[];

  @IsOptional()
  @IsString()
  reason?: string;
}

export class ScorecardDto {
  @IsString()
  @MinLength(2)
  period!: string;

  @Type(() => Number)
  @IsNumber()
  onTimeDeliveryPct!: number;

  @Type(() => Number)
  @IsNumber()
  qualityRate!: number;

  @Type(() => Number)
  @IsNumber()
  priceCompetitiveness!: number;

  @Type(() => Number)
  @IsNumber()
  responsiveness!: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
