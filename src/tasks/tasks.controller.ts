import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import { User } from '../users/entities/user.entity';
import { RolesGuard } from '../auth/guards/roles.guard';
import { FileInterceptor } from '@nestjs/platform-express';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  create(@Body() createTaskDto: CreateTaskDto, @GetUser() user: User) {
    return this.tasksService.create(createTaskDto, user);
  }

  @Get()
  findAll(@GetUser() user: User) {
    return this.tasksService.findAllForUser(user.id);
  }

  @Get('archived')
  findAllArchived(@GetUser() user: User) {
    return this.tasksService.findAllArchivedForUser(user.id);
  }

  @Get('closed')
  getAllClosed() {
    return this.tasksService.findAllGlobalCompletedTasks();
  }

  @Get('analytics')
  getAnalytics() {
    return this.tasksService.findAllGlobalTasks();
  }

  @Get(':id')
  findOne(@Param('id') id: string, @GetUser() user: User) {
    return this.tasksService.findOne(id, user.id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateTaskDto: UpdateTaskDto,
    @GetUser() user: User,
  ) {
    return this.tasksService.update(id, updateTaskDto, user);
  }

  @Get('comments/recent')
  getRecentComments() {
    return this.tasksService.findRecentComments();
  }

  @Post(':id/attachments')
  @UseInterceptors(FileInterceptor('file'))
  // FIX: Replaced Express.Multer.File with any to resolve "Cannot find namespace 'Express'" error.
  uploadFile(@Param('id') id: string, @UploadedFile() file: any) {
    return this.tasksService.addAttachment(id, file);
  }

  @Post(':id/reminders')
  @HttpCode(HttpStatus.OK)
  sendReminders(@Param('id') id: string, @GetUser() user: User) {
    return this.tasksService.sendManualReminder(id, user);
  }

  @Post(':id/comments')
  addComment(
    @Param('id') id: string,
    @Body('content') content: string,
    @GetUser() user: User,
  ) {
    return this.tasksService.addComment(id, content, user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @GetUser() user: User) {
    return this.tasksService.remove(id, user);
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  archive(@Param('id') id: string, @GetUser() user: User) {
    return this.tasksService.archiveTask(id, user);
  }

  @Post(':id/unarchive')
  @HttpCode(HttpStatus.OK)
  unarchive(@Param('id') id: string, @GetUser() user: User) {
    return this.tasksService.unarchiveTask(id, user);
  }
}
