import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddTransactionDto } from './dto/add-transaction.dto';
import { GetTransactionHistoryDto } from './dto/get-transaction-history.dto';
import { Prisma, Transaction, TransactionType } from '@prisma/client';

@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  async addTransaction(
    accountId: string,
    dto: AddTransactionDto,
  ): Promise<{ transaction: Transaction; isDuplicate: boolean }> {
    // 1. Verify account exists
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new NotFoundException(`Account with id '${accountId}' not found`);
    }

    // 2. Check for duplicate reference_id within the same account
    const existing = await this.prisma.transaction.findUnique({
      where: {
        accountId_referenceId: {
          accountId,
          referenceId: dto.referenceId,
        },
      },
    });

    if (existing) {
      return { transaction: existing, isDuplicate: true };
    }

    // 3. For debit, check sufficient balance
    if (dto.type === TransactionType.debit) {
      const currentBalance = Number(account.balance);
      if (dto.amount > currentBalance) {
        throw new BadRequestException({
          message: 'Insufficient balance',
          details: {
            currentBalance: account.balance.toString(),
            requestedDebit: dto.amount.toString(),
          },
        });
      }
    }

    // 4. Atomically create transaction + update balance
    const amountDecimal = new Prisma.Decimal(dto.amount);
    const balanceDelta =
      dto.type === TransactionType.credit ? amountDecimal : amountDecimal.neg();

    const [transaction] = await this.prisma.$transaction([
      this.prisma.transaction.create({
        data: {
          accountId,
          type: dto.type,
          amount: amountDecimal,
          description: dto.description,
          referenceId: dto.referenceId,
        },
      }),
      this.prisma.account.update({
        where: { id: accountId },
        data: {
          balance: {
            increment: balanceDelta,
          },
        },
      }),
    ]);

    return { transaction, isDuplicate: false };
  }

  async getTransactionHistory(
    accountId: string,
    query: GetTransactionHistoryDto,
  ) {
    // Verify account exists
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new NotFoundException(`Account with id '${accountId}' not found`);
    }

    const { type, page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.TransactionWhereInput = {
      accountId,
      ...(type ? { type } : {}),
    };

    const [transactions, totalRecords] = await this.prisma.$transaction([
      this.prisma.transaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.transaction.count({ where }),
    ]);

    const totalPages = Math.ceil(totalRecords / limit);

    return {
      transactions: transactions.map((t) => ({
        id: t.id,
        accountId: t.accountId,
        type: t.type,
        amount: t.amount.toString(),
        description: t.description,
        referenceId: t.referenceId,
        createdAt: t.createdAt,
      })),
      page,
      pageSize: limit,
      totalRecords,
      totalPages,
    };
  }
}
