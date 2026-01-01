import {
  Injectable,
  NotFoundException,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
// FIX: Import TaskDocument to use for Mongoose model and document typing.
import { Task, TaskDocument } from './entities/task.entity';
import { Team, TeamDocument } from '../teams/entities/team.entity';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailService } from '../email/email.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    // FIX: Use TaskDocument for the injected model type.
    @InjectModel(Task.name) private taskModel: Model<TaskDocument>,
    @InjectModel(Team.name) private teamModel: Model<TeamDocument>,
    private readonly usersService: UsersService,
    private readonly notificationsService: NotificationsService,
    private readonly emailService: EmailService,
    private cloudinaryService: CloudinaryService,
  ) {}

  async create(dto: CreateTaskDto, user: User): Promise<Task | null> {
    //const { assigneeIds, ...taskData } = createTaskDto;

    // Determine the final list of assignee IDs for the new task.
    /*
    let finalAssigneeIds: string[];
    if (assigneeIds && assigneeIds.length > 0) {
      finalAssigneeIds = assigneeIds;
    } else {
      // If no assignees are provided, assign the task to the creator by default.
      finalAssigneeIds = [user.id];
    }
      */

    // Fetch the full user documents for the assignees. This is needed for sending notifications.
    // const assignees = await this.usersService.findByIds(finalAssigneeIds);

    /* const createdTask = new this.taskModel({
      ...taskData,
      // Pass the creator's ID for the owner field.
      owner: user.id,
      // Pass the array of assignee IDs. Mongoose will cast these to ObjectIds.
      assignees: finalAssigneeIds,
      assignedGroup: dto.assignedGroupId || undefined,
    });
    */

    //const savedTask = await createdTask.save();

    /*
    // Create notifications for assignees, but don't notify the creator if they assigned it to themselves.
    for (const assignee of assignees) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      if (assignee.id.toString() !== user.id.toString()) {
        await this.notificationsService.create({
          user: assignee, // The service expects a User document or object with an ID.
          type: 'task',
          message: `${user.name} assigned you a new task: "${savedTask.title}"`,
        });

        // console.log(`ASSIGNEE EMAIL: ${assignee.email}`);

        // Email notification
        if (assignee.email) {
          emailPromises.push(
            this.emailService.sendTaskAssignmentEmail(
              assignee.email,
              savedTask.title,
              user.name,
              // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
              savedTask.id,
            ),
          );
        }
      }
    }

    await Promise.allSettled(emailPromises);

    // Find the newly created task by its ID and populate the 'owner' and 'assignees' fields before returning it.
    return this.taskModel
    .findById(savedTask.id)
    .populate('owner assignees')
    .exec();
  */

    const createdTask = new this.taskModel({
      ...dto,
      owner: user.id,
      assignees: dto.assigneeIds || [],
      assignedTeam: dto.assignedTeamId || undefined,
    });

    const savedTask = await createdTask.save();
    const task = await this.taskModel
      .findById(savedTask.id)
      .populate('owner assignees assignedTeam')
      .exec();

    // Collect email promises to await them all at the end
    const emailPromises: Promise<any>[] = [];

    if (task !== null) {
      if (task.assignees) {
        for (const assignee of task.assignees) {
          if (assignee.id.toString() !== user.id) {
            await this.notificationsService.create({
              user: assignee,
              type: 'task',
              message: `New task: "${task.title}"`,
            });

            if (assignee.email)
              emailPromises.push(
                this.emailService.sendTaskAssignmentEmail(
                  assignee.email,
                  task.title,
                  user.name,
                  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                  task.id,
                ),
              );
          }
        }
      }

      // Notify team members if a team is assigned
      if (task.assignedTeam) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
        const team = await (task.assignedTeam as any).populate('members');
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        for (const member of team.members) {
          const isIndividualAssignee = task.assignees.some(
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
            (a) => a.id.toString() === member.id.toString(),
          );
          // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
          if (member.id.toString() !== user.id && !isIndividualAssignee) {
            await this.notificationsService.create({
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
              user: member,
              type: 'task',
              // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
              message: `Team Task: "${task.title}" was assigned to ${team.name}`,
            });

            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            if (member.email)
              emailPromises.push(
                this.emailService.sendTaskAssignmentTeamEmail(
                  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
                  member.email,
                  task.title,
                  user.name,
                  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
                  team.name,
                ),
              );
          }
        }
      }
    }

    // Wait for all emails to be sent.
    // Using Promise.allSettled allows successful emails to pass even if one fails.
    await Promise.allSettled(emailPromises);
    return task;
  }

  async findAllForUser(userId: string): Promise<Task[]> {
    return this.taskModel
      .find({
        $or: [
          { assignees: userId, isArchived: false },
          { owner: userId, isArchived: false },
        ],
      })
      .populate(
        'owner assignees assignedTeam title status comments.author updatedAt isArchived attachments',
      )
      .sort({ createdAt: 'asc' })
      .exec();
  }

  findAllArchivedForUser(userId: string): Promise<Task[]> {
    return this.taskModel
      .find({
        assignees: userId,
        isArchived: true,
      })
      .populate('owner assignees assignedTeam')
      .sort({ updatedAt: 'desc' })
      .exec();
  }

  // Method for global analytics (all completed tasks)
  async findAllGlobalCompletedTasks(): Promise<Task[]> {
    return this.taskModel
      .find({
        $or: [{ status: 'Closed' }, { isArchived: true }],
      })
      .select('title status isArchived createdAt owner updatedAt assignedTeam')
      .exec();
  }

  async findAllGlobalTasks(): Promise<Task[]> {
    // Return all tasks to allow frontend to calculate Open/Active/Closed trends
    return this.taskModel
      .find()
      .select('title status isArchived createdAt owner updatedAt assignedTeam')
      .exec();
  }

  // FIX: Change return type to TaskDocument to ensure methods like .save() and properties like ._id are available.
  /*
  async findOne(id: string, userId: string): Promise<TaskDocument> {
    const task = await this.taskModel
      .findById(id)
      .populate('owner assignees assignedTeam comments.author')
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

  async findOne(id: string, userId: string): Promise<TaskDocument> {
    const task = await this.taskModel
      .findById(id)
      .populate('owner assignees assignedTeam comments.author')
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

  */

  async findOne(id: string): Promise<TaskDocument> {
    const task = await this.taskModel
      .findById(id)
      .populate('owner assignees assignedTeam comments.author attachments')
      .exec();
    if (!task) {
      throw new NotFoundException(`Task with ID "${id}" not found`);
    }

    return task;
  }

  async update(
    id: string,
    updateTaskDto: UpdateTaskDto,
    user: User,
  ): Promise<Task | null> {
    const task = await this.findOne(id);
    const originalStatus = task.status;

    if (updateTaskDto.assigneeIds) {
      task.assignees = await this.usersService.findByIds(
        updateTaskDto.assigneeIds,
      );
    }
    if (updateTaskDto.assignedTeamId !== undefined) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      task.assignedTeam = updateTaskDto.assignedTeamId as any;
      // Explicitly set fields to ensure Mongoose tracks changes correctly
    }

    // Check if team assignment changed
    if (updateTaskDto.assignedTeamId !== undefined) {
      //if (task.assignedTeam !== undefined) {
      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      const oldTeamId = task.assignedTeam?.toString();
      const newTeamId = updateTaskDto.assignedTeamId;

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      task.assignedTeam = newTeamId
        ? (new Types.ObjectId(newTeamId) as any)
        : undefined;

      // If a new team is assigned (not just cleared), notify everyone on that team
      if (newTeamId && oldTeamId !== newTeamId) {
        void this.notifyTeamMembers(id, newTeamId, user.name);
      }
      //}
    }

    // Check if team assignment changed
    if (updateTaskDto.assignedTeamId !== undefined) {
      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      const oldTeamId = task.assignedTeam?.toString();
      const newTeamId = updateTaskDto.assignedTeamId;

      // Correctly handle removal or reassignment
      if (newTeamId && newTeamId.length === 24) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        task.assignedTeam = new Types.ObjectId(newTeamId) as any;

        // If a new team is assigned (not just cleared), notify everyone on that team
        if (oldTeamId !== newTeamId) {
          void this.notifyTeamMembers(id, newTeamId, user.name);
        }
      }
    }

    if (updateTaskDto.title !== undefined) task.title = updateTaskDto.title;
    if (updateTaskDto.description !== undefined)
      task.description = updateTaskDto.description;
    if (updateTaskDto.status !== undefined) task.status = updateTaskDto.status;
    if (updateTaskDto.priority !== undefined)
      task.priority = updateTaskDto.priority;
    if (updateTaskDto.dueDate !== undefined)
      task.dueDate = new Date(updateTaskDto.dueDate);

    if (updateTaskDto.attachments !== undefined)
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      task.attachments = updateTaskDto.attachments;

    const savedTask = await task.save();

    if (
      updateTaskDto.status !== undefined &&
      updateTaskDto.status !== originalStatus
    ) {
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
      .populate('owner assignees assignedTeam comments.author')
      .exec();
  }

  private async notifyTeamMembers(
    taskId: string,
    teamId: string,
    assignerName: string,
  ) {
    try {
      const team = await this.teamModel
        .findById(teamId)
        .populate('members')
        .exec();
      const task = await this.taskModel.findById(taskId).exec();

      if (team && team.members && task) {
        for (const member of team.members) {
          if (member.email) {
            await this.emailService.sendTaskAssignmentEmail(
              member.email,
              task.title,
              assignerName,
              taskId,
            );
          }
          // Also add in-app notification
          await this.notificationsService.create({
            user: member,
            type: 'task',
            message: `${assignerName} assigned your team to task: "${task.title}"`,
          });
        }
      }
    } catch (error) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      this.logger.error(
        `Failed to notify team members for team ${teamId}:`,
        error,
      );
    }
  }

  /*
  async addComment(
    taskId: string,
    content: string,
    user: User,
  ): Promise<Task | null> {
    const task = await this.taskModel.findById(taskId).exec();
    if (!task) throw new NotFoundException('Task not found');

    // Ensure we use the correct ID string, handling both POJO (id) and Document (_id)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const authorId = user.id || (user as any)._id?.toString();

    const comment = {
      id: new Types.ObjectId().toString(),
      content,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      author: authorId,
      timestamp: new Date(),
    };

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    task.comments.push(comment as any);
    await task.save();

    // Handle Mentions
    const allUsers = await this.usersService.findAll();
    const mentions = content.match(/@([\w\s]+)/g);

    if (mentions) {
      for (const mention of mentions) {
        const nameToFind = mention.substring(1).trim(); // Remove @
        // eslint-disable-next-line prettier/prettier
        const mentionedUser = allUsers.find(u => u.name.toLowerCase() === nameToFind.toLowerCase());
        if (mentionedUser && mentionedUser.id !== user.id) {
          await this.notificationsService.create({
            user: mentionedUser,
            type: 'mention',
            message: `${user.name} mentioned you in a comment on "${task.title}"`,
          });
        }
      }
    }
  
    return this.taskModel
      .findById(taskId)
      .populate('owner assignees comments.author')
      .exec();
  }

  */

  async addComment(
    taskId: string,
    content: string,
    user: User,
  ): Promise<Task | null> {
    const task = await this.taskModel.findById(taskId).exec();
    if (!task) throw new NotFoundException('Task not found');

    // Ensure we use the correct ID string
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const authorId = user.id || (user as any)._id?.toString();

    const comment = {
      id: new Types.ObjectId().toString(),
      content,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      author: authorId, // Save as ID, not object, to prevent CastError
      timestamp: new Date(),
    };

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    task.comments.push(comment as any);
    await task.save();

    // Handle Mentions
    const allUsers = await this.usersService.findAll();
    const mentions = content.match(/@([\w\s]+)/g);

    if (mentions) {
      for (const mention of mentions) {
        const nameToFind = mention.substring(1).trim(); // Remove @
        // eslint-disable-next-line prettier/prettier
        const mentionedUser = allUsers.find(u => u.name.toLowerCase() === nameToFind.toLowerCase());
        if (mentionedUser && mentionedUser.id !== user.id) {
          await this.notificationsService.create({
            user: mentionedUser,
            type: 'mention',
            message: `${user.name} mentioned you in a comment on "${task.title}"`,
          });
        }
      }
    }

    // Return fully populated task so frontend gets user details immediately
    return this.taskModel
      .findById(taskId)
      .populate('owner assignees assignedTeam comments.author')
      .exec();
  }

  // FIX: Replaced Express.Multer.File with any to resolve "Cannot find namespace 'Express'" error.
  async addAttachment(taskId: string, file: any): Promise<Task | null> {
    const task = await this.taskModel.findById(taskId).exec();
    if (!task) throw new NotFoundException('Task not found');

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    const base64File = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;

    const url = await this.cloudinaryService.uploadImage(base64File);

    const attachment = {
      id: new Types.ObjectId().toString(),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      fileName: file.originalname,
      url: url,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      size: file.size,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      mimetype: file.mimetype,
    };

    task.attachments.push(attachment);
    await task.save();
    return this.taskModel
      .findById(taskId)
      .populate('owner assignees assignedTeam comments.author')
      .exec();
  }

  async deleteAttachment(taskId: string, attachmentId: string): Promise<Task> {
    const task = await this.taskModel.findById(taskId).exec();
    if (!task) throw new NotFoundException('Task not found');

    task.attachments = task.attachments.filter((a) => a.id !== attachmentId);
    await task.save();
    return this.findOne(taskId);
  }

  async findRecentComments(): Promise<any[]> {
    return this.taskModel
      .aggregate([
        { $unwind: '$comments' },
        { $sort: { 'comments.timestamp': -1 } },
        { $limit: 20 },
        {
          $lookup: {
            from: 'users',
            localField: 'comments.author',
            foreignField: '_id',
            as: 'author',
          },
        },
        { $unwind: { path: '$author', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            id: '$comments.id',
            taskTitle: '$title',
            taskId: '$_id',
            content: '$comments.content',
            author: {
              name: '$author.name',
              avatar: '$author.avatar',
              id: '$author._id',
            },
            timestamp: '$comments.timestamp',
          },
        },
      ])
      .exec();
  }

  async sendManualReminder(
    id: string,
    user: User,
  ): Promise<{ message: string }> {
    const task = await this.findOne(id);

    if (!task.assignees || task.assignees.length === 0) {
      throw new BadRequestException('No assignees to remind.');
    }

    const emailPromises: Promise<any>[] = [];

    for (const assignee of task.assignees) {
      // Create notification
      await this.notificationsService.create({
        user: assignee,
        type: 'task',
        message: `Reminder: Please check task "${task.title}". Sent by ${user.name}.`,
      });

      // Send email
      if (assignee.email) {
        emailPromises.push(
          this.emailService.sendTaskReminderEmail(
            assignee.email,
            task.title,
            user.name,
          ),
        );
      }
    }

    await Promise.allSettled(emailPromises);
    return { message: 'Reminders sent successfully.' };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async remove(id: string, user: User): Promise<{ message: string }> {
    const task = await this.findOne(id);
    await this.taskModel.deleteOne({ _id: task._id }).exec();
    return { message: `Task with ID "${id}" has been removed` };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async archiveTask(id: string, user: User): Promise<Task | null> {
    const task = await this.findOne(id);
    if (task.status !== 'Closed') {
      throw new BadRequestException('Only closed tasks can be archived.');
    }
    task.isArchived = true;

    //return task.save();
    await task.save();
    return this.taskModel
      .findById(id)
      .populate('owner assignees assignedTeam')
      .exec();
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async unarchiveTask(id: string, user: User): Promise<Task | null> {
    const task = await this.findOne(id);
    task.isArchived = false;

    //return task.save();

    await task.save();
    return this.taskModel
      .findById(id)
      .populate('owner assignees assignedTeam')
      .exec();
  }

  // --- Methods for Scheduler ---
  async findOverdueTasks(): Promise<Task[]> {
    return this.taskModel
      .find({
        dueDate: { $lt: new Date() },
        status: { $ne: 'Closed' },
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
        status: { $ne: 'Closed' },
        isArchived: false,
      })
      .populate('assignees')
      .exec();
  }

  async findTasksDueToday(): Promise<TaskDocument[]> {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    return this.taskModel
      .find({
        dueDate: { $gte: startOfToday, $lte: endOfToday },
        status: { $ne: 'Closed' },
        isArchived: false,
        dueReminderSent: false,
      })
      .populate('owner')
      .populate('assignees')
      .populate({ path: 'assignedTeam', populate: { path: 'members' } })
      .exec();
  }

  async markDueReminderSent(taskId: string): Promise<void> {
    await this.taskModel
      .updateOne({ _id: taskId }, { $set: { dueReminderSent: true } })
      .exec();
  }
}
