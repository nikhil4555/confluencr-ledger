import { Controller, Post, Body, HttpStatus, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import type { Response } from 'express';
import { TransfersService } from './transfers.service';
import { CreateTransferDto } from './dto/create-transfer.dto';
import { TransferResponseDto } from './dto/transfer-response.dto';

@ApiTags('Transfers')
@Controller('transfers')
export class TransfersController {
  constructor(private readonly transfersService: TransfersService) {}

  @Post()
  @ApiOperation({
    summary: 'Transfer money between two accounts',
    description:
      'Atomically debits the source account and credits the destination account. ' +
      'Both operations succeed or both are rolled back — a partial transfer is never possible. ' +
      'Submitting the same referenceId again returns the original transfer result without re-executing.',
  })
  @ApiBody({ type: CreateTransferDto })
  @ApiResponse({ status: 201, description: 'Transfer completed successfully', type: TransferResponseDto })
  @ApiResponse({ status: 200, description: 'Duplicate transfer — already executed (no change made)', type: TransferResponseDto })
  @ApiResponse({ status: 400, description: 'Insufficient balance, same account, or validation error' })
  @ApiResponse({ status: 404, description: 'Source or destination account not found' })
  async transfer(@Body() dto: CreateTransferDto, @Res() res: Response) {
    const result = await this.transfersService.transfer(dto);

    const data = {
      referenceId: result.referenceId,
      amount: result.amount,
      description: result.description,
      debit: result.debit,
      credit: result.credit,
      fromAccountBalance: result.fromAccountBalance,
      toAccountBalance: result.toAccountBalance,
      createdAt: result.createdAt,
    };

    if (result.isDuplicate) {
      return res.status(HttpStatus.OK).json({
        status: 'success',
        statusCode: HttpStatus.OK,
        message: 'Transfer with this referenceId has already been executed. No changes were made.',
        data: [data],
      });
    }

    return res.status(HttpStatus.CREATED).json({
      status: 'success',
      statusCode: HttpStatus.CREATED,
      message: 'Transfer completed successfully',
      data: [data],
    });
  }
}
