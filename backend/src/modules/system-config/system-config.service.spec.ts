import { Test, TestingModule } from '@nestjs/testing';
import { SystemConfigService } from './system-config.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SystemConfig } from '@/database/entities/system-config.entity';

describe('SystemConfigService', () => {
  let service: SystemConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SystemConfigService,
        {
          provide: getRepositoryToken(SystemConfig),
          useValue: {
            findOne: jest.fn(),
            update: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
            find: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<SystemConfigService>(SystemConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
