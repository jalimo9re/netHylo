import { Test, TestingModule } from '@nestjs/testing';
import { SystemConfigController } from './system-config.controller';
import { SystemConfigService } from './system-config.service';

describe('SystemConfigController', () => {
  let controller: SystemConfigController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SystemConfigController],
      providers: [
        {
          provide: SystemConfigService,
          useValue: {
            getAll: jest.fn().mockResolvedValue({}),
            set: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    controller = module.get<SystemConfigController>(SystemConfigController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
