import { ApiProperty } from '@nestjs/swagger';

export class TransferLegDto {
  @ApiProperty({ example: 'uuid-v4-string' })
  transactionId: string;

  @ApiProperty({ example: 'uuid-v4-string' })
  accountId: string;

  @ApiProperty({ enum: ['credit', 'debit'], example: 'debit' })
  type: string;

  @ApiProperty({ example: '30.00' })
  amount: string;
}

export class TransferResponseDto {
  @ApiProperty({ example: 'TRANSFER-20241028-001' })
  referenceId: string;

  @ApiProperty({ example: '30.00' })
  amount: string;

  @ApiProperty({ example: 'Rent payment' })
  description: string;

  @ApiProperty({ type: TransferLegDto, description: 'Debit leg (source account)' })
  debit: TransferLegDto;

  @ApiProperty({ type: TransferLegDto, description: 'Credit leg (destination account)' })
  credit: TransferLegDto;

  @ApiProperty({ example: '70.00', description: 'Updated balance of the source account' })
  fromAccountBalance: string;

  @ApiProperty({ example: '80.00', description: 'Updated balance of the destination account' })
  toAccountBalance: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: string;
}
