import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { AccountsService } from './accounts.service';
import { CreateAccountDto } from './dto/create-account.dto';
import { AccountResponseDto, BalanceResponseDto } from './dto/account-response.dto';
import { ParseUuidPipe } from '../common/pipes/parse-uuid.pipe';

@ApiTags('Accounts')
@Controller('accounts')
export class AccountsController {
  constructor(private readonly accountsService: AccountsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new account' })
  @ApiBody({ type: CreateAccountDto })
  @ApiResponse({ status: 201, description: 'Account created successfully', type: AccountResponseDto })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async create(@Body() dto: CreateAccountDto) {
    const account = await this.accountsService.create(dto);
    return {
      message: 'Account created successfully',
      data: {
        id: account.id,
        name: account.name,
        balance: account.balance.toString(),
        createdAt: account.createdAt,
      },
    };
  }

  @Get(':id/balance')
  @ApiOperation({ summary: 'Get account balance by account ID' })
  @ApiParam({ name: 'id', description: 'Account UUID', type: String })
  @ApiResponse({ status: 200, description: 'Account balance retrieved', type: BalanceResponseDto })
  @ApiResponse({ status: 404, description: 'Account not found' })
  async getBalance(@Param('id', new ParseUuidPipe('id')) id: string) {
    const result = await this.accountsService.getBalance(id);
    return {
      message: 'Account balance retrieved successfully',
      data: result,
    };
  }
}
