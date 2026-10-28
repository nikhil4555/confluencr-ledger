import { ApiProperty } from '@nestjs/swagger';

export class AccountResponseDto {
  @ApiProperty({ example: 'uuid-v4-string' })
  id: string;

  @ApiProperty({ example: 'John Doe' })
  name: string;

  @ApiProperty({ example: '0.00', description: 'Current balance (string for precision)' })
  balance: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  createdAt: Date;
}

export class BalanceResponseDto {
  @ApiProperty({ example: 'uuid-v4-string' })
  accountId: string;

  @ApiProperty({ example: '150.00' })
  balance: string;
}
