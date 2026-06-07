import { Test, TestingModule } from '@nestjs/testing';
import { AccessoriesController } from './accessories.controller';

describe('AccessoriesController', () => {
  let controller: AccessoriesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AccessoriesController],
    }).compile();

    controller = module.get<AccessoriesController>(AccessoriesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
