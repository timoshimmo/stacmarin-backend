
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Group, GroupDocument } from './entities/group.entity';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';

@Injectable()
export class GroupsService {
  constructor(@InjectModel(Group.name) private groupModel: Model<GroupDocument>) {}

  async create(dto: CreateGroupDto): Promise<Group> {
    const existing = await this.groupModel.findOne({ name: dto.name });
    if (existing) throw new ConflictException('Group name taken');

    const created = new this.groupModel({
      name: dto.name,
      description: dto.description,
      members: dto.memberIds || []
    });
    const saved = await created.save();
    return this.groupModel.findById(saved.id).populate('members').exec();
  }

  async findAll(): Promise<Group[]> {
    return this.groupModel.find().populate('members').sort({ name: 'asc' }).exec();
  }

  async update(id: string, dto: UpdateGroupDto): Promise<Group> {
    const update: any = { ...dto };
    if (dto.memberIds) {
      update.members = dto.memberIds;
      delete update.memberIds;
    }
    const updated = await this.groupModel.findByIdAndUpdate(id, update, { new: true }).populate('members').exec();
    if (!updated) throw new NotFoundException('Group not found');
    return updated;
  }

  async remove(id: string): Promise<void> {
    await this.groupModel.findByIdAndDelete(id).exec();
  }
}
