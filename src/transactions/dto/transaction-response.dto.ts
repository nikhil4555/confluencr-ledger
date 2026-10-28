import { ApiProperty } from '@nestjs/swagger';
import { TransactionType } from '@prisma/client';

export class TransactionResponseDto {
  @ApiProperty({ example: 'uuid-v4-string' })
  id: string;

  @ApiProperty({ example: 'uuid-v4-string' })
  accountId: string;

  @ApiProperty({ enum: TransactionType, example: 'credit' })
  type: TransactionType;

  @ApiProperty({ example: '100.00' })
  amount: string;

  @ApiProperty({ example: 'Salary deposit' })
  description: string;

  @ApiProperty({ example: 'TXN-2024-001' })
  referenceId: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;
}

export class PaginatedTransactionsDto {
  @ApiProperty({ type: [TransactionResponseDto] })
  data: TransactionResponseDto[];

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  pageSize: number;

  @ApiProperty({ example: 42 })
  totalRecords: number;

  @ApiProperty({ example: 5 })
  totalPages: number;
}
