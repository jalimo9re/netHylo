import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Plan } from '@/database/entities/plan.entity';

@Injectable()
export class PlansService {
  constructor(
    @InjectRepository(Plan) private planRepo: Repository<Plan>,
  ) {}

  async findAll() {
    return this.planRepo.find();
  }

  async findOne(id: string) {
    return this.planRepo.findOneOrFail({ where: { id } });
  }
}
