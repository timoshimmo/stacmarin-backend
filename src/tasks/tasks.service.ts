import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
// FIX: Import TaskDocument to use for Mongoose model and document typing.
import { Task, TaskDocument } from './entities/task.entity';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class TasksService {
  constructor(
    // FIX: Use TaskDocument for the injected model type.
    @InjectModel(Task.name) private taskModel: Model<TaskDocument>,
    private readonly usersService: UsersService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(createTaskDto: CreateTaskDto, user: User): Promise<Task | null> {
    const { assigneeIds, ...taskData } = createTaskDto;

    // Determine the final list of assignee IDs for the new task.
    let finalAssigneeIds: string[];
    if (assigneeIds && assigneeIds.length > 0) {
      finalAssigneeIds = assigneeIds;
    } else {
      // If no assignees are provided, assign the task to the creator by default.
      finalAssigneeIds = [user.id];
    }

    // Fetch the full user documents for the assignees. This is needed for sending notifications.
    const assignees = await this.usersService.findByIds(finalAssigneeIds);

    const createdTask = new this.taskModel({
      ...taskData,
      // Pass the creator's ID for the owner field.
      owner: user.id,
      // Pass the array of assignee IDs. Mongoose will cast these to ObjectIds.
      assignees: finalAssigneeIds,
    });

    const savedTask = await createdTask.save();

    // Create notifications for assignees, but don't notify the creator if they assigned it to themselves.
    for (const assignee of assignees) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      if (assignee.id.toString() !== user.id.toString()) {
        await this.notificationsService.create({
          user: assignee, // The service expects a User document or object with an ID.
          type: 'task',
          message: `${user.name} assigned you a new task: "${savedTask.title}"`,
        });
      }
    }

    // Find the newly created task by its ID and populate the 'owner' and 'assignees' fields before returning it.
    return this.taskModel
      .findById(savedTask.id)
      .populate('owner assignees')
      .exec();
  }

  findAllForUser(userId: string): Promise<Task[]> {
    return this.taskModel
      .find({
        assignees: userId,
        isArchived: false,
      })
      .populate('owner assignees')
      .sort({ createdAt: 'asc' })
      .exec();
  }

  findAllArchivedForUser(userId: string): Promise<Task[]> {
    return this.taskModel
      .find({
        assignees: userId,
        isArchived: true,
      })
      .populate('owner assignees')
      .sort({ updatedAt: 'desc' })
      .exec();
  }

  // FIX: Change return type to TaskDocument to ensure methods like .save() and properties like ._id are available.
  async findOne(id: string, userId: string): Promise<TaskDocument> {
    const task = await this.taskModel
      .findById(id)
      .populate('owner assignees')
      .exec();
    if (!task) {
      throw new NotFoundException(`Task with ID "${id}" not found`);
    }

    const isAssignee = task.assignees.some(
      (assignee) => assignee.id.toString() === userId,
    );
    if (!isAssignee) {
      throw new ForbiddenException(
        'You do not have permission to access this task',
      );
    }
    return task;
  }

  async update(
    id: string,
    updateTaskDto: UpdateTaskDto,
    user: User,
  ): Promise<Task | null> {
    const task = await this.findOne(id, user.id);
    const originalStatus = task.status;

    if (updateTaskDto.assigneeIds) {
      task.assignees = await this.usersService.findByIds(
        updateTaskDto.assigneeIds,
      );
      delete updateTaskDto.assigneeIds;
    }

    Object.assign(task, updateTaskDto);

    const savedTask = await task.save();

    if ('status' in updateTaskDto && updateTaskDto.status !== originalStatus) {
      if (savedTask.assignees) {
        for (const assignee of savedTask.assignees) {
          if (assignee.id.toString() !== user.id) {
            await this.notificationsService.create({
              user: assignee,
              type: 'task',
              message: `${user.name} changed the status of "${savedTask.title}" to ${savedTask.status}.`,
            });
          }
        }
      }
    }

    return this.taskModel
      .findById(savedTask.id)
      .populate('owner assignees')
      .exec();
  }

  async remove(id: string, user: User): Promise<{ message: string }> {
    const task = await this.findOne(id, user.id);
    await this.taskModel.deleteOne({ _id: task._id }).exec();
    return { message: `Task with ID "${id}" has been removed` };
  }

  async archiveTask(id: string, user: User): Promise<Task> {
    const task = await this.findOne(id, user.id);
    if (task.status !== 'Done') {
      throw new BadRequestException('Only completed tasks can be archived.');
    }
    task.isArchived = true;
    return task.save();
  }

  async unarchiveTask(id: string, user: User): Promise<Task> {
    const task = await this.findOne(id, user.id);
    task.isArchived = false;
    return task.save();
  }

  // --- Methods for Scheduler ---
  async findOverdueTasks(): Promise<Task[]> {
    return this.taskModel
      .find({
        dueDate: { $lt: new Date() },
        status: { $ne: 'Done' },
        isArchived: false,
      })
      .populate('assignees')
      .exec();
  }

  async findTasksDueSoon(): Promise<Task[]> {
    const now = new Date();
    const twentyFourHoursFromNow = new Date(
      now.getTime() + 24 * 60 * 60 * 1000,
    );
    return this.taskModel
      .find({
        dueDate: { $gte: now, $lte: twentyFourHoursFromNow },
        status: { $ne: 'Done' },
        isArchived: false,
      })
      .populate('assignees')
      .exec();
  }
}
