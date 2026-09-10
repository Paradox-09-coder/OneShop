/*
  Warnings:

  - You are about to drop the `Branch` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `FounderProfile` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `FounderTransaction` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Loan` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `LoanPayment` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "FounderProfile" DROP CONSTRAINT "FounderProfile_counterpartyId_fkey";

-- DropForeignKey
ALTER TABLE "FounderTransaction" DROP CONSTRAINT "FounderTransaction_founderId_fkey";

-- DropForeignKey
ALTER TABLE "Loan" DROP CONSTRAINT "Loan_lenderId_fkey";

-- DropForeignKey
ALTER TABLE "LoanPayment" DROP CONSTRAINT "LoanPayment_loanId_fkey";

-- DropTable
DROP TABLE "Branch";

-- DropTable
DROP TABLE "FounderProfile";

-- DropTable
DROP TABLE "FounderTransaction";

-- DropTable
DROP TABLE "Loan";

-- DropTable
DROP TABLE "LoanPayment";
