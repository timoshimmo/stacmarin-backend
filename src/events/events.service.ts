import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Event, EventDocument } from './entities/event.entity';
import { CreateEventDto } from './dto/create-event.dto';
import { User } from '../users/entities/user.entity';

@Injectable()
export class EventsService {
  constructor(
    @InjectModel(Event.name) private eventModel: Model<EventDocument>,
  ) {}

  async create(createEventDto: CreateEventDto, user: User): Promise<Event> {
    const createdEvent = new this.eventModel({
      ...createEventDto,
      createdBy: user.id,
    });
    const savedEvent = await createdEvent.save();
    return this.eventModel.findById(savedEvent.id).populate('createdBy').exec();
  }

  findAll(): Promise<Event[]> {
    return this.eventModel
      .find()
      .populate('createdBy')
      .sort({ start: 'asc' })
      .exec();
  }
}
