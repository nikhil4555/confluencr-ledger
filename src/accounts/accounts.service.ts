import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { Account } from '@prisma/client';

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAccountDto): Promise<Account> {
    return this.prisma.account.create({
      data: {
        name: dto.name,
        // balance defaults to 0 via schema — client cannot set it
      },
    });
  }

  async getBalance(
    accountId: string,
  ): Promise<{ accountId: string; balance: string }> {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
      select: { id: true, balance: true },
    });

    if (!account) {
      throw new NotFoundException(`Account with id '${accountId}' not found`);
    }

    return {
      accountId: account.id,
      balance: account.balance.toString(),
    };
  }

  async findById(accountId: string): Promise<Account> {
    const account = await this.prisma.account.findUnique({
      where: { id: accountId },
    });

    if (!account) {
      throw new NotFoundException(`Account with id '${accountId}' not found`);
    }

    return account;
  }
}
