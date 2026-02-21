import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Recognition } from './entities/recognition.entity';
import { CreateRecognitionDto } from './dto/create-recognition.dto';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class RecognitionService {
  constructor(
    @InjectModel(Recognition.name) private recognitionModel: Model<Recognition>,
    private usersService: UsersService,
    private notificationsService: NotificationsService,
  ) {}

  async create(
    createRecognitionDto: CreateRecognitionDto,
    sender: User,
  ): Promise<Recognition | null> {
    const recipient = await this.usersService.findOne(
      createRecognitionDto.recipientId,
    );
    if (!recipient) {
      throw new NotFoundException('Recipient not found');
    }

    const recognition = new this.recognitionModel({
      sender: sender.id,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      recipient: recipient.id,
      message: createRecognitionDto.message,
      isAnonymous: true, // Force anonymous as requested
    });

    const savedRecognition = await recognition.save();

    // Notify the recipient
    if (recipient.id !== sender.id) {
      await this.notificationsService.create({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        user: recipient.id,
        type: 'kudos',
        message: `You received new kudos from an anonymous colleague!`,
      });
    }

    return this.recognitionModel
      .findById(savedRecognition.id)
      .populate('sender recipient')
      .exec();
  }

  async findAll(): Promise<Recognition[]> {
    return this.recognitionModel
      .find()
      .populate('sender recipient')
      .sort({ createdAt: 'desc' })
      .limit(50)
      .exec();
  }
}
