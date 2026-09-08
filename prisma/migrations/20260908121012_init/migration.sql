-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SELLER', 'WAREHOUSE', 'ACCOUNTANT', 'USER');

-- CreateEnum
CREATE TYPE "CounterpartyType" AS ENUM ('CLIENT', 'SUPPLIER', 'EMPLOYEE', 'FOUNDER', 'LENDER', 'OTHER');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('UZS', 'USD', 'EUR', 'RUB');

-- CreateEnum
CREATE TYPE "CustomerKind" AS ENUM ('RESELLER', 'RETAIL');

-- CreateEnum
CREATE TYPE "SalaryType" AS ENUM ('FIXED', 'KPI', 'MIXED');

-- CreateEnum
CREATE TYPE "UnitType" AS ENUM ('DONA', 'METR', 'M2', 'MM', 'KG', 'LITR');

-- CreateEnum
CREATE TYPE "RollStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'IN_USE', 'DEPLETED');

-- CreateEnum
CREATE TYPE "MovementType" AS ENUM ('IN', 'OUT', 'ADJUST', 'WASTE');

-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('IN_TRANSIT', 'ARRIVED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('RETAIL', 'WHOLESALE', 'MANUFACTURING', 'POS');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('YANGI_SOROV', 'MASLAHAT_BERILDI', 'NARX_KELISHILDI', 'BUYURTMA_OLINDI', 'YETKAZILMOQDA', 'YAKUNLANDI', 'PROPOSAL', 'NEW', 'PROCESSING', 'READY', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "OrderPriority" AS ENUM ('NORMAL', 'HIGH', 'VIP');

-- CreateEnum
CREATE TYPE "OrderChannel" AS ENUM ('INSTAGRAM', 'TELEGRAM', 'PHONE', 'WALK_IN', 'WEBSITE', 'OTHER');

-- CreateEnum
CREATE TYPE "FulfillmentType" AS ENUM ('DELIVERY', 'PICKUP');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('FULL', 'PARTIAL', 'DEFERRED', 'INSTALLMENT', 'NOT_CONFIRMED');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('CASH', 'BANK');

-- CreateEnum
CREATE TYPE "PaymentTxType" AS ENUM ('CASH_IN', 'CASH_OUT', 'BANK_IN', 'BANK_OUT', 'TRANSFER');

-- CreateEnum
CREATE TYPE "PaymentSource" AS ENUM ('ORDER', 'EXPENSE', 'PAYROLL', 'SUPPLIER_DEBT_PAYMENT', 'SHIPMENT', 'BATCH_RECEIVE', 'PAYMENT_SCHEDULE', 'LOAN', 'FOUNDER_TX', 'MANUAL');

-- CreateEnum
CREATE TYPE "PaymentScheduleItemStatus" AS ENUM ('PENDING', 'PARTIAL', 'PAID', 'OVERDUE');

-- CreateEnum
CREATE TYPE "CrmFunnel" AS ENUM ('LEAD', 'BUYER');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('INFO', 'SUCCESS', 'WARNING', 'DANGER');

-- CreateEnum
CREATE TYPE "LogAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'IMPORT', 'EXPORT', 'LOGIN', 'LOGOUT', 'TRANSITION', 'VOID');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "password" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "customRoleId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomRole" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "mappedRole" "Role" NOT NULL DEFAULT 'USER',
    "permissions" JSONB NOT NULL DEFAULT '[]',
    "routeAccess" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "jwtHash" TEXT NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Counterparty" (
    "id" TEXT NOT NULL,
    "type" "CounterpartyType" NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT,
    "phone" TEXT,
    "phone2" TEXT,
    "email" TEXT,
    "telegram" TEXT,
    "inn" TEXT,
    "address" TEXT,
    "locationLat" DOUBLE PRECISION,
    "locationLng" DOUBLE PRECISION,
    "region" TEXT,
    "balanceValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "balanceCurrency" "Currency" NOT NULL DEFAULT 'UZS',
    "status" TEXT NOT NULL DEFAULT 'active',
    "notes" TEXT,
    "deletedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Counterparty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientProfile" (
    "counterpartyId" TEXT NOT NULL,
    "customerKind" "CustomerKind" NOT NULL DEFAULT 'RETAIL',
    "rating" INTEGER,
    "funnel" "CrmFunnel",
    "stage" TEXT,
    "assignedEmployeeId" TEXT,
    "source" TEXT,
    "resaleScheduledAt" TIMESTAMP(3),
    "currentDebtCache" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientProfile_pkey" PRIMARY KEY ("counterpartyId")
);

-- CreateTable
CREATE TABLE "SupplierProfile" (
    "counterpartyId" TEXT NOT NULL,
    "totalPurchasedCache" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ordersCountCache" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierProfile_pkey" PRIMARY KEY ("counterpartyId")
);

-- CreateTable
CREATE TABLE "Employee" (
    "counterpartyId" TEXT NOT NULL,
    "userId" TEXT,
    "position" TEXT,
    "baseSalary" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "salaryCurrency" "Currency" NOT NULL DEFAULT 'UZS',
    "salaryType" "SalaryType" NOT NULL DEFAULT 'FIXED',
    "kpiPercentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "startDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("counterpartyId")
);

-- CreateTable
CREATE TABLE "FounderProfile" (
    "counterpartyId" TEXT NOT NULL,
    "sharePct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "investment" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dividends" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FounderProfile_pkey" PRIMARY KEY ("counterpartyId")
);

-- CreateTable
CREATE TABLE "CounterpartyNote" (
    "id" TEXT NOT NULL,
    "counterpartyId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CounterpartyNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CounterpartyExpense" (
    "id" TEXT NOT NULL,
    "counterpartyId" TEXT NOT NULL,
    "orderId" TEXT,
    "expenseType" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'UZS',
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CounterpartyExpense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Warehouse" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Warehouse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Branch" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "address" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CatalogProduct" (
    "id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "displayName" TEXT,
    "categoryId" TEXT,
    "unitType" "UnitType" NOT NULL DEFAULT 'DONA',
    "unitQuantity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "baseCost" DOUBLE PRECISION,
    "baseCostCurrency" "Currency" NOT NULL DEFAULT 'UZS',
    "basePrice" DOUBLE PRECISION,
    "basePriceCurrency" "Currency" NOT NULL DEFAULT 'UZS',
    "minPrice" DOUBLE PRECISION,
    "minPriceCurrency" "Currency" NOT NULL DEFAULT 'UZS',
    "color" TEXT,
    "thicknessMm" DOUBLE PRECISION,
    "model" TEXT,
    "type" TEXT,
    "weight" DOUBLE PRECISION,
    "volume" DOUBLE PRECISION,
    "imageUrl" TEXT,
    "extraExpenses" JSONB,
    "supplierId" TEXT,
    "warehouseId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "lowStockThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CatalogProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductPriceHistory" (
    "id" TEXT NOT NULL,
    "catalogProductId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "oldValue" DOUBLE PRECISION,
    "newValue" DOUBLE PRECISION NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'UZS',
    "changedBy" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductPriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryLot" (
    "id" TEXT NOT NULL,
    "catalogProductId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "qty" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "unitType" "UnitType" NOT NULL DEFAULT 'DONA',
    "cost" DOUBLE PRECISION,
    "costCurrency" "Currency" NOT NULL DEFAULT 'UZS',
    "price" DOUBLE PRECISION,
    "priceCurrency" "Currency" NOT NULL DEFAULT 'UZS',
    "supplierId" TEXT,
    "invoiceNo" TEXT,
    "purchaseDate" TIMESTAMP(3),
    "lowStockThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryLot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryRoll" (
    "id" TEXT NOT NULL,
    "catalogProductId" TEXT NOT NULL,
    "warehouseId" TEXT,
    "totalWidthMm" DOUBLE PRECISION NOT NULL,
    "totalLengthMm" DOUBLE PRECISION NOT NULL,
    "remainingLengthMm" DOUBLE PRECISION NOT NULL,
    "status" "RollStatus" NOT NULL DEFAULT 'AVAILABLE',
    "batchNumber" TEXT,
    "rollNumber" TEXT,
    "supplierId" TEXT,
    "shipmentItemId" TEXT,
    "receivedDate" TIMESTAMP(3),
    "cost" DOUBLE PRECISION,
    "costCurrency" "Currency" NOT NULL DEFAULT 'UZS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryRoll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Remnant" (
    "id" TEXT NOT NULL,
    "catalogProductId" TEXT NOT NULL,
    "sourceRollId" TEXT,
    "sourceOrderId" TEXT,
    "widthMm" DOUBLE PRECISION NOT NULL,
    "lengthMm" DOUBLE PRECISION NOT NULL,
    "areaM2" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'available',
    "usedInOrderId" TEXT,
    "offsetX" DOUBLE PRECISION,
    "offsetY" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Remnant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdditionalProduct" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "unitType" "UnitType" NOT NULL DEFAULT 'DONA',
    "defaultPrice" DOUBLE PRECISION,
    "defaultPriceCurrency" "Currency" NOT NULL DEFAULT 'UZS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdditionalProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL,
    "catalogProductId" TEXT NOT NULL,
    "inventoryLotId" TEXT,
    "inventoryRollId" TEXT,
    "warehouseId" TEXT NOT NULL,
    "type" "MovementType" NOT NULL,
    "qty" DOUBLE PRECISION NOT NULL,
    "cost" DOUBLE PRECISION,
    "currency" "Currency" NOT NULL DEFAULT 'UZS',
    "reason" TEXT,
    "orderId" TEXT,
    "paymentMode" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shipment" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "containerNumber" TEXT,
    "status" "ShipmentStatus" NOT NULL DEFAULT 'IN_TRANSIT',
    "shippingDate" TIMESTAMP(3),
    "arrivalDate" TIMESTAMP(3),
    "totalProductCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalExpenses" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" "Currency" NOT NULL DEFAULT 'UZS',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShipmentItem" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "catalogProductId" TEXT,
    "productNameSnapshot" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'UZS',
    "widthMm" DOUBLE PRECISION,
    "lengthMm" DOUBLE PRECISION,
    "transferredToInventory" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShipmentItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShipmentExpense" (
    "id" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "expenseType" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'UZS',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShipmentExpense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "proposalNumber" TEXT,
    "contractNumber" TEXT,
    "type" "OrderType" NOT NULL DEFAULT 'RETAIL',
    "status" "OrderStatus" NOT NULL DEFAULT 'YANGI_SOROV',
    "priority" "OrderPriority" NOT NULL DEFAULT 'NORMAL',
    "channel" "OrderChannel",
    "fulfillmentType" "FulfillmentType",
    "clientId" TEXT,
    "clientNameSnapshot" TEXT,
    "clientPhoneSnapshot" TEXT,
    "sellerEmployeeId" TEXT,
    "assignedEmployeeId" TEXT,
    "estimatedAmount" DOUBLE PRECISION,
    "agreedAmount" DOUBLE PRECISION,
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discountPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalAreaM2" DOUBLE PRECISION,
    "orderCurrency" "Currency" NOT NULL DEFAULT 'UZS',
    "exchangeRateSnapshot" DOUBLE PRECISION,
    "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paymentType" "PaymentType",
    "scheduledAt" TIMESTAMP(3),
    "expectedDeliveryDate" TIMESTAMP(3),
    "deliveryAddress" TEXT,
    "nextFollowupAt" TIMESTAMP(3),
    "followupNote" TEXT,
    "installmentMonthlyAmount" DOUBLE PRECISION,
    "installmentStartDate" TIMESTAMP(3),
    "installmentDueDay" INTEGER,
    "installmentMonths" INTEGER,
    "installmentNextPaymentDate" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "catalogProductId" TEXT NOT NULL,
    "productNameSnapshot" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unitType" "UnitType" NOT NULL DEFAULT 'DONA',
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'UZS',
    "rollId" TEXT,
    "widthMm" DOUBLE PRECISION,
    "lengthMm" DOUBLE PRECISION,
    "areaM2" DOUBLE PRECISION,
    "wasteAreaM2" DOUBLE PRECISION,
    "joiningMethod" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderAdditionalItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "additionalProductId" TEXT,
    "name" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "totalPrice" DOUBLE PRECISION NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'UZS',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderAdditionalItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderStatusHistory" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "fromStatus" "OrderStatus",
    "toStatus" "OrderStatus" NOT NULL,
    "changedById" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT,

    CONSTRAINT "OrderStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "AccountType" NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'UZS',
    "balanceCache" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransactionCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "counterpartyMode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransactionCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransactionSubcategory" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TransactionSubcategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" "PaymentTxType" NOT NULL,
    "accountId" TEXT,
    "counterpartyId" TEXT,
    "counterpartyNameSnapshot" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'UZS',
    "exchangeRateSnapshot" DOUBLE PRECISION,
    "originalAmount" DOUBLE PRECISION,
    "originalCurrency" "Currency",
    "categoryId" TEXT,
    "subcategoryId" TEXT,
    "description" TEXT,
    "sourceType" "PaymentSource" NOT NULL,
    "sourceId" TEXT,
    "sourceLabel" TEXT,
    "orderId" TEXT,
    "voidedAt" TIMESTAMP(3),
    "voidedById" TEXT,
    "voidReason" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "scheduleItemId" TEXT,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentSchedule" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'UZS',
    "months" INTEGER NOT NULL,
    "monthlyAmount" DOUBLE PRECISION NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "dueDay" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentScheduleItem" (
    "id" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paidAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "PaymentScheduleItemStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentScheduleItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "clockIn" TIMESTAMP(3) NOT NULL,
    "clockOut" TIMESTAMP(3),
    "totalHours" DOUBLE PRECISION,
    "date" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendancePause" (
    "id" TEXT NOT NULL,
    "attendanceId" TEXT NOT NULL,
    "pauseStart" TIMESTAMP(3) NOT NULL,
    "pauseEnd" TIMESTAMP(3),
    "durationMinutes" INTEGER,

    CONSTRAINT "AttendancePause_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollAccrual" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'UZS',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayrollAccrual_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Loan" (
    "id" TEXT NOT NULL,
    "lenderId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "remaining" DOUBLE PRECISION NOT NULL,
    "rate" DOUBLE PRECISION,
    "currency" "Currency" NOT NULL DEFAULT 'UZS',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Loan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoanPayment" (
    "id" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'UZS',
    "paymentDate" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,

    CONSTRAINT "LoanPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FounderTransaction" (
    "id" TEXT NOT NULL,
    "founderId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'UZS',
    "date" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FounderTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmStageConfig" (
    "id" TEXT NOT NULL,
    "funnel" "CrmFunnel" NOT NULL,
    "stageKey" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "color" TEXT,
    "isTerminal" BOOLEAN NOT NULL DEFAULT false,
    "requiresReason" BOOLEAN NOT NULL DEFAULT false,
    "requiresResaleDate" BOOLEAN NOT NULL DEFAULT false,
    "triggersOrderCreation" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrmStageConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmStageReason" (
    "id" TEXT NOT NULL,
    "stageConfigId" TEXT NOT NULL,
    "reasonLabel" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrmStageReason_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CrmStageHistory" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "funnel" "CrmFunnel" NOT NULL,
    "fromStage" TEXT,
    "toStage" TEXT NOT NULL,
    "stageConfigId" TEXT,
    "reason" TEXT,
    "changedBy" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CrmStageHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CallLog" (
    "id" TEXT NOT NULL,
    "externalEventId" TEXT,
    "action" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "clientId" TEXT,
    "recordingUrl" TEXT,
    "rawPayload" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CallLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "type" "NotificationType" NOT NULL DEFAULT 'INFO',
    "title" TEXT NOT NULL,
    "body" TEXT,
    "link" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "UserDashboardSetting" (
    "userId" TEXT NOT NULL,
    "visibleCards" JSONB NOT NULL DEFAULT '[]',
    "warehouseColumnSettings" JSONB DEFAULT '{}',
    "language" TEXT NOT NULL DEFAULT 'uz',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserDashboardSetting_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "FxRate" (
    "id" TEXT NOT NULL,
    "base" "Currency" NOT NULL,
    "quote" "Currency" NOT NULL,
    "rate" DOUBLE PRECISION NOT NULL,
    "effectiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FxRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Log" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "screen" TEXT NOT NULL,
    "action" "LogAction" NOT NULL,
    "description" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_customRoleId_idx" ON "User"("customRoleId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomRole_key_key" ON "CustomRole"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Session_jwtHash_key" ON "Session"("jwtHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Counterparty_type_idx" ON "Counterparty"("type");

-- CreateIndex
CREATE INDEX "Counterparty_deletedAt_idx" ON "Counterparty"("deletedAt");

-- CreateIndex
CREATE INDEX "Counterparty_phone_idx" ON "Counterparty"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_userId_key" ON "Employee"("userId");

-- CreateIndex
CREATE INDEX "CounterpartyNote_counterpartyId_idx" ON "CounterpartyNote"("counterpartyId");

-- CreateIndex
CREATE INDEX "CounterpartyExpense_counterpartyId_idx" ON "CounterpartyExpense"("counterpartyId");

-- CreateIndex
CREATE UNIQUE INDEX "Warehouse_name_key" ON "Warehouse"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Branch_name_key" ON "Branch"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Branch_code_key" ON "Branch"("code");

-- CreateIndex
CREATE INDEX "ProductCategory_parentId_idx" ON "ProductCategory"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "CatalogProduct_sku_key" ON "CatalogProduct"("sku");

-- CreateIndex
CREATE INDEX "CatalogProduct_categoryId_idx" ON "CatalogProduct"("categoryId");

-- CreateIndex
CREATE INDEX "CatalogProduct_warehouseId_idx" ON "CatalogProduct"("warehouseId");

-- CreateIndex
CREATE INDEX "CatalogProduct_supplierId_idx" ON "CatalogProduct"("supplierId");

-- CreateIndex
CREATE INDEX "ProductPriceHistory_catalogProductId_idx" ON "ProductPriceHistory"("catalogProductId");

-- CreateIndex
CREATE INDEX "InventoryLot_catalogProductId_idx" ON "InventoryLot"("catalogProductId");

-- CreateIndex
CREATE INDEX "InventoryLot_warehouseId_idx" ON "InventoryLot"("warehouseId");

-- CreateIndex
CREATE INDEX "InventoryRoll_catalogProductId_idx" ON "InventoryRoll"("catalogProductId");

-- CreateIndex
CREATE INDEX "InventoryRoll_status_idx" ON "InventoryRoll"("status");

-- CreateIndex
CREATE INDEX "Remnant_catalogProductId_idx" ON "Remnant"("catalogProductId");

-- CreateIndex
CREATE INDEX "Remnant_status_idx" ON "Remnant"("status");

-- CreateIndex
CREATE INDEX "StockMovement_catalogProductId_idx" ON "StockMovement"("catalogProductId");

-- CreateIndex
CREATE INDEX "StockMovement_warehouseId_idx" ON "StockMovement"("warehouseId");

-- CreateIndex
CREATE INDEX "StockMovement_orderId_idx" ON "StockMovement"("orderId");

-- CreateIndex
CREATE INDEX "StockMovement_createdAt_idx" ON "StockMovement"("createdAt");

-- CreateIndex
CREATE INDEX "Shipment_supplierId_idx" ON "Shipment"("supplierId");

-- CreateIndex
CREATE INDEX "Shipment_status_idx" ON "Shipment"("status");

-- CreateIndex
CREATE INDEX "ShipmentItem_shipmentId_idx" ON "ShipmentItem"("shipmentId");

-- CreateIndex
CREATE INDEX "ShipmentExpense_shipmentId_idx" ON "ShipmentExpense"("shipmentId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Order_proposalNumber_key" ON "Order"("proposalNumber");

-- CreateIndex
CREATE INDEX "Order_clientId_idx" ON "Order"("clientId");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "Order"("status");

-- CreateIndex
CREATE INDEX "Order_type_idx" ON "Order"("type");

-- CreateIndex
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderItem_catalogProductId_idx" ON "OrderItem"("catalogProductId");

-- CreateIndex
CREATE INDEX "OrderAdditionalItem_orderId_idx" ON "OrderAdditionalItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderStatusHistory_orderId_idx" ON "OrderStatusHistory"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "TransactionCategory_name_key" ON "TransactionCategory"("name");

-- CreateIndex
CREATE INDEX "Payment_date_idx" ON "Payment"("date");

-- CreateIndex
CREATE INDEX "Payment_type_idx" ON "Payment"("type");

-- CreateIndex
CREATE INDEX "Payment_sourceType_sourceId_idx" ON "Payment"("sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "Payment_counterpartyId_idx" ON "Payment"("counterpartyId");

-- CreateIndex
CREATE INDEX "Payment_orderId_idx" ON "Payment"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentSchedule_orderId_key" ON "PaymentSchedule"("orderId");

-- CreateIndex
CREATE INDEX "PaymentScheduleItem_scheduleId_idx" ON "PaymentScheduleItem"("scheduleId");

-- CreateIndex
CREATE INDEX "PaymentScheduleItem_status_dueDate_idx" ON "PaymentScheduleItem"("status", "dueDate");

-- CreateIndex
CREATE INDEX "Attendance_employeeId_idx" ON "Attendance"("employeeId");

-- CreateIndex
CREATE INDEX "Attendance_date_idx" ON "Attendance"("date");

-- CreateIndex
CREATE INDEX "AttendancePause_attendanceId_idx" ON "AttendancePause"("attendanceId");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollAccrual_employeeId_period_key" ON "PayrollAccrual"("employeeId", "period");

-- CreateIndex
CREATE UNIQUE INDEX "CrmStageConfig_funnel_stageKey_key" ON "CrmStageConfig"("funnel", "stageKey");

-- CreateIndex
CREATE INDEX "CrmStageHistory_clientId_idx" ON "CrmStageHistory"("clientId");

-- CreateIndex
CREATE INDEX "CrmStageHistory_changedAt_idx" ON "CrmStageHistory"("changedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CallLog_externalEventId_key" ON "CallLog"("externalEventId");

-- CreateIndex
CREATE INDEX "CallLog_clientId_idx" ON "CallLog"("clientId");

-- CreateIndex
CREATE INDEX "CallLog_occurredAt_idx" ON "CallLog"("occurredAt");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE INDEX "FxRate_base_quote_effectiveAt_idx" ON "FxRate"("base", "quote", "effectiveAt");

-- CreateIndex
CREATE INDEX "Log_createdAt_idx" ON "Log"("createdAt");

-- CreateIndex
CREATE INDEX "Log_screen_idx" ON "Log"("screen");

-- CreateIndex
CREATE INDEX "Log_userId_idx" ON "Log"("userId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_customRoleId_fkey" FOREIGN KEY ("customRoleId") REFERENCES "CustomRole"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientProfile" ADD CONSTRAINT "ClientProfile_counterpartyId_fkey" FOREIGN KEY ("counterpartyId") REFERENCES "Counterparty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierProfile" ADD CONSTRAINT "SupplierProfile_counterpartyId_fkey" FOREIGN KEY ("counterpartyId") REFERENCES "Counterparty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_counterpartyId_fkey" FOREIGN KEY ("counterpartyId") REFERENCES "Counterparty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FounderProfile" ADD CONSTRAINT "FounderProfile_counterpartyId_fkey" FOREIGN KEY ("counterpartyId") REFERENCES "Counterparty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CounterpartyNote" ADD CONSTRAINT "CounterpartyNote_counterpartyId_fkey" FOREIGN KEY ("counterpartyId") REFERENCES "Counterparty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CounterpartyExpense" ADD CONSTRAINT "CounterpartyExpense_counterpartyId_fkey" FOREIGN KEY ("counterpartyId") REFERENCES "Counterparty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CounterpartyExpense" ADD CONSTRAINT "CounterpartyExpense_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCategory" ADD CONSTRAINT "ProductCategory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ProductCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogProduct" ADD CONSTRAINT "CatalogProduct_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ProductCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CatalogProduct" ADD CONSTRAINT "CatalogProduct_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductPriceHistory" ADD CONSTRAINT "ProductPriceHistory_catalogProductId_fkey" FOREIGN KEY ("catalogProductId") REFERENCES "CatalogProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryLot" ADD CONSTRAINT "InventoryLot_catalogProductId_fkey" FOREIGN KEY ("catalogProductId") REFERENCES "CatalogProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryLot" ADD CONSTRAINT "InventoryLot_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryRoll" ADD CONSTRAINT "InventoryRoll_catalogProductId_fkey" FOREIGN KEY ("catalogProductId") REFERENCES "CatalogProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryRoll" ADD CONSTRAINT "InventoryRoll_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryRoll" ADD CONSTRAINT "InventoryRoll_shipmentItemId_fkey" FOREIGN KEY ("shipmentItemId") REFERENCES "ShipmentItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Remnant" ADD CONSTRAINT "Remnant_catalogProductId_fkey" FOREIGN KEY ("catalogProductId") REFERENCES "CatalogProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Remnant" ADD CONSTRAINT "Remnant_sourceRollId_fkey" FOREIGN KEY ("sourceRollId") REFERENCES "InventoryRoll"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Remnant" ADD CONSTRAINT "Remnant_sourceOrderId_fkey" FOREIGN KEY ("sourceOrderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Remnant" ADD CONSTRAINT "Remnant_usedInOrderId_fkey" FOREIGN KEY ("usedInOrderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_catalogProductId_fkey" FOREIGN KEY ("catalogProductId") REFERENCES "CatalogProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_inventoryLotId_fkey" FOREIGN KEY ("inventoryLotId") REFERENCES "InventoryLot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_inventoryRollId_fkey" FOREIGN KEY ("inventoryRollId") REFERENCES "InventoryRoll"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Counterparty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentItem" ADD CONSTRAINT "ShipmentItem_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentItem" ADD CONSTRAINT "ShipmentItem_catalogProductId_fkey" FOREIGN KEY ("catalogProductId") REFERENCES "CatalogProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShipmentExpense" ADD CONSTRAINT "ShipmentExpense_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Counterparty"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_sellerEmployeeId_fkey" FOREIGN KEY ("sellerEmployeeId") REFERENCES "Counterparty"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_assignedEmployeeId_fkey" FOREIGN KEY ("assignedEmployeeId") REFERENCES "Counterparty"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_catalogProductId_fkey" FOREIGN KEY ("catalogProductId") REFERENCES "CatalogProduct"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_rollId_fkey" FOREIGN KEY ("rollId") REFERENCES "InventoryRoll"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderAdditionalItem" ADD CONSTRAINT "OrderAdditionalItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderAdditionalItem" ADD CONSTRAINT "OrderAdditionalItem_additionalProductId_fkey" FOREIGN KEY ("additionalProductId") REFERENCES "AdditionalProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderStatusHistory" ADD CONSTRAINT "OrderStatusHistory_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionSubcategory" ADD CONSTRAINT "TransactionSubcategory_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "TransactionCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_counterpartyId_fkey" FOREIGN KEY ("counterpartyId") REFERENCES "Counterparty"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "TransactionCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_subcategoryId_fkey" FOREIGN KEY ("subcategoryId") REFERENCES "TransactionSubcategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_voidedById_fkey" FOREIGN KEY ("voidedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_scheduleItemId_fkey" FOREIGN KEY ("scheduleItemId") REFERENCES "PaymentScheduleItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentSchedule" ADD CONSTRAINT "PaymentSchedule_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentScheduleItem" ADD CONSTRAINT "PaymentScheduleItem_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "PaymentSchedule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("counterpartyId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendancePause" ADD CONSTRAINT "AttendancePause_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "Attendance"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollAccrual" ADD CONSTRAINT "PayrollAccrual_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("counterpartyId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_lenderId_fkey" FOREIGN KEY ("lenderId") REFERENCES "Counterparty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanPayment" ADD CONSTRAINT "LoanPayment_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FounderTransaction" ADD CONSTRAINT "FounderTransaction_founderId_fkey" FOREIGN KEY ("founderId") REFERENCES "Counterparty"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmStageReason" ADD CONSTRAINT "CrmStageReason_stageConfigId_fkey" FOREIGN KEY ("stageConfigId") REFERENCES "CrmStageConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmStageHistory" ADD CONSTRAINT "CrmStageHistory_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Counterparty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CrmStageHistory" ADD CONSTRAINT "CrmStageHistory_stageConfigId_fkey" FOREIGN KEY ("stageConfigId") REFERENCES "CrmStageConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CallLog" ADD CONSTRAINT "CallLog_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Counterparty"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserDashboardSetting" ADD CONSTRAINT "UserDashboardSetting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Log" ADD CONSTRAINT "Log_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
