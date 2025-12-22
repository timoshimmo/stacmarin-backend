import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Team, TeamDocument } from './entities/team.entity';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';

@Injectable()
export class TeamsService {
  constructor(@InjectModel(Team.name) private teamModel: Model<TeamDocument>) {}

  async create(dto: CreateTeamDto): Promise<Team | null> {
    const existing = await this.teamModel.findOne({ name: dto.name });
    if (existing) throw new ConflictException('Team name taken');

    const created = new this.teamModel({
      name: dto.name,
      description: dto.description,
      members: dto.memberIds || [],
    });
    const saved = await created.save();
    return this.teamModel.findById(saved.id).populate('members').exec();
  }

  async findAll(): Promise<Team[]> {
    return this.teamModel
      .find()
      .populate('members')
      .sort({ name: 'asc' })
      .exec();
  }

  async findOne(id: string): Promise<Team> {
    const team = await this.teamModel.findById(id).populate('members').exec();
    if (!team) throw new NotFoundException('Team not found');
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
      .populate('members')
      .exec();
    if (!updated) throw new NotFoundException('Team not found');
    return updated;
  }

  async remove(id: string): Promise<void> {
    const result = await this.teamModel.findByIdAndDelete(id).exec();
    if (!result) throw new NotFoundException('Team not found');
  }
}
