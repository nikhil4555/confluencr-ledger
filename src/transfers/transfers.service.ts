import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TransactionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransferDto } from './dto/create-transfer.dto';

@Injectable()
export class TransfersService {
  constructor(private readonly prisma: PrismaService) {}

  async transfer(dto: CreateTransferDto) {
    const { fromAccountId, toAccountId, amount, description, referenceId } = dto;

    // 1. Source and destination must not be the same account
    if (fromAccountId === toAccountId) {
      throw new BadRequestException(
        'Source and destination accounts must be different',
      );
    }

    // 2. Both accounts must exist
    const [fromAccount, toAccount] = await Promise.all([
      this.prisma.account.findUnique({ where: { id: fromAccountId } }),
      this.prisma.account.findUnique({ where: { id: toAccountId } }),
    ]);

    if (!fromAccount) {
      throw new NotFoundException(
        `Source account with id '${fromAccountId}' not found`,
      );
    }
    if (!toAccount) {
      throw new NotFoundException(
        `Destination account with id '${toAccountId}' not found`,
      );
    }

    // 3. Check for duplicate transfer (idempotency) —
    //    a transfer is identified by referenceId on the debit leg of the source account
    const debitReferenceId = `TRANSFER-DEBIT-${referenceId}`;
    const creditReferenceId = `TRANSFER-CREDIT-${referenceId}`;

    const existingDebit = await this.prisma.transaction.findUnique({
      where: {
        accountId_referenceId: {
          accountId: fromAccountId,
          referenceId: debitReferenceId,
        },
      },
    });

    if (existingDebit) {
      // Transfer already executed — fetch both legs and return idempotent response
      const existingCredit = await this.prisma.transaction.findUnique({
        where: {
          accountId_referenceId: {
            accountId: toAccountId,
            referenceId: creditReferenceId,
          },
        },
      });

      const [latestFrom, latestTo] = await Promise.all([
        this.prisma.account.findUnique({ where: { id: fromAccountId } }),
        this.prisma.account.findUnique({ where: { id: toAccountId } }),
      ]);

      return {
        isDuplicate: true,
        referenceId,
        amount: existingDebit.amount.toString(),
        description: existingDebit.description,
        debit: {
          transactionId: existingDebit.id,
          accountId: existingDebit.accountId,
          type: existingDebit.type,
          amount: existingDebit.amount.toString(),
        },
        credit: existingCredit
          ? {
              transactionId: existingCredit.id,
              accountId: existingCredit.accountId,
              type: existingCredit.type,
              amount: existingCredit.amount.toString(),
            }
          : null,
        fromAccountBalance: latestFrom!.balance.toString(),
        toAccountBalance: latestTo!.balance.toString(),
        createdAt: existingDebit.createdAt.toISOString(),
      };
    }

    // 4. Sufficient balance check on source account
    const currentBalance = Number(fromAccount.balance);
    if (amount > currentBalance) {
      throw new BadRequestException({
        message: 'Insufficient balance in source account',
        details: {
          currentBalance: fromAccount.balance.toString(),
          requestedTransfer: amount.toString(),
        },
      });
    }

    // 5. Atomic transfer: debit source + credit destination + update both balances
    const amountDecimal = new Prisma.Decimal(amount);
    const now = new Date();

    const [debitTx, creditTx, updatedFrom, updatedTo] =
      await this.prisma.$transaction([
        // Debit leg — source account
        this.prisma.transaction.create({
          data: {
            accountId: fromAccountId,
            type: TransactionType.debit,
            amount: amountDecimal,
            description,
            referenceId: debitReferenceId,
            createdAt: now,
          },
        }),
        // Credit leg — destination account
        this.prisma.transaction.create({
          data: {
            accountId: toAccountId,
            type: TransactionType.credit,
            amount: amountDecimal,
            description,
            referenceId: creditReferenceId,
            createdAt: now,
          },
        }),
        // Deduct from source
        this.prisma.account.update({
          where: { id: fromAccountId },
          data: { balance: { decrement: amountDecimal } },
        }),
        // Add to destination
        this.prisma.account.update({
          where: { id: toAccountId },
          data: { balance: { increment: amountDecimal } },
        }),
      ]);

    return {
      isDuplicate: false,
      referenceId,
      amount: amountDecimal.toString(),
      description,
      debit: {
        transactionId: debitTx.id,
        accountId: debitTx.accountId,
        type: debitTx.type,
        amount: debitTx.amount.toString(),
      },
      credit: {
        transactionId: creditTx.id,
        accountId: creditTx.accountId,
        type: creditTx.type,
        amount: creditTx.amount.toString(),
      },
      fromAccountBalance: updatedFrom.balance.toString(),
      toAccountBalance: updatedTo.balance.toString(),
      createdAt: now.toISOString(),
    };
  }
}
