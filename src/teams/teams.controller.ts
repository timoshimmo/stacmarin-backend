import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { TeamsService } from './teams.service';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole, User } from '../users/entities/user.entity';
import { GetUser } from '../common/decorators/get-user.decorator';

@Controller('teams')
@UseGuards(JwtAuthGuard)
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.MANAGER)
  create(@Body() dto: CreateTeamDto, @GetUser() user: User) {
    return this.teamsService.create(dto, user);
  }

  @Get()
  findAll() {
    return this.teamsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string, @GetUser() user: User) {
    return this.teamsService.findOne(id, user);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.MANAGER)
  update(@Param('id') id: string, @Body() dto: UpdateTeamDto) {
    return this.teamsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.MANAGER)
  remove(@Param('id') id: string) {
    return this.teamsService.remove(id);
  }
}
