import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Team, TeamDocument } from './entities/team.entity';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { User, UserRole } from '../users/entities/user.entity';

@Injectable()
export class TeamsService {
  constructor(@InjectModel(Team.name) private teamModel: Model<TeamDocument>) {}

  async create(dto: CreateTeamDto, user: User): Promise<Team | null> {
    const existing = await this.teamModel.findOne({ name: dto.name });
    if (existing) throw new ConflictException('Team name taken');

    const created = new this.teamModel({
      name: dto.name,
      description: dto.description,
      members: dto.memberIds || [],
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      createdBy: user.id || (user as any)._id,
    });
    const saved = await created.save();
    return this.teamModel
      .findById(saved.id)
      .populate('members createdBy')
      .exec();
  }

  async findAll(): Promise<Team[]> {
    return this.teamModel
      .find()
      .populate('members createdBy')
      .sort({ name: 'asc' })
      .exec();
  }

  async findOne(id: string, user: User): Promise<Team> {
    const team = await this.teamModel
      .findById(id)
      .populate('members createdBy')
      .exec();
    if (!team) throw new NotFoundException('Team not found');

    // Authorization check: Only creator or Admin
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const creatorId =
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      team.createdBy?.id || (team.createdBy as any)?._id?.toString();
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const userId = user.id || (user as any)._id?.toString();

    if (creatorId !== userId && user.role !== UserRole.MANAGER) {
      throw new ForbiddenException(
        'You do not have permission to view this team',
      );
    }

    return team;
  }

  async update(id: string, dto: UpdateTeamDto): Promise<Team> {
    const update: any = { ...dto };
    if (dto.memberIds) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      update.members = dto.memberIds;
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      delete update.memberIds;
    }
    const updated = await this.teamModel
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      .findByIdAndUpdate(id, update, { new: true })
      .populate('members createdBy')
      .exec();
    if (!updated) throw new NotFoundException('Team not found');
    return updated;
  }

  async remove(id: string): Promise<void> {
    const result = await this.teamModel.findByIdAndDelete(id).exec();
    if (!result) throw new NotFoundException('Team not found');
  }
}
