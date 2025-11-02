import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import { User, UserRole } from './entities/user.entity';
import { UsersService } from './users.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    @UseGuards(JwtAuthGuard, RolesGuard)
    @Get()
    @Roles(UserRole.ADMIN)
    findAll() {
        return this.usersService.findAll();
    }

    @UseGuards(JwtAuthGuard)
    @Get('me')
    getProfile(@GetUser() user: User) {
        return user;
    }

    @UseGuards(JwtAuthGuard)
    @Get('directory')
    getDirectory() {
        return this.usersService.findAll();
    }
}
