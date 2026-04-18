import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DefaultParameters } from '../common/constants';
import { Session } from '../common/entities/session.entity';
import { ParameterService } from '../parameter/parameter.service';
import { TherapistStatisticsService } from './therapist.stats';

describe('TherapistStatisticsService', () => {
  let service: TherapistStatisticsService;

  const rawRows = [
    {
      session_id: 'session-1',
      session_schedule: '2026-04-10T07:00:00.000Z',
      sub_price: null,
      sub_therapistPercentage: null,
      modal_name: 'Group Therapy',
      level_type: null,
      rootsub_type: null,
      gsub_id: 'sub-1',
      gsub_price: 100,
      gsubRootSub_type: 1,
      gatt_id: 'attendee-1',
    },
    {
      session_id: 'session-1',
      session_schedule: '2026-04-10T07:00:00.000Z',
      sub_price: null,
      sub_therapistPercentage: null,
      modal_name: 'Group Therapy',
      level_type: null,
      rootsub_type: null,
      gsub_id: 'sub-2',
      gsub_price: 100,
      gsubRootSub_type: 1,
      gatt_id: 'attendee-1',
    },
    {
      session_id: 'session-1',
      session_schedule: '2026-04-10T07:00:00.000Z',
      sub_price: null,
      sub_therapistPercentage: null,
      modal_name: 'Group Therapy',
      level_type: null,
      rootsub_type: null,
      gsub_id: 'sub-3',
      gsub_price: 100,
      gsubRootSub_type: 1,
      gatt_id: 'attendee-1',
    },
    {
      session_id: 'session-1',
      session_schedule: '2026-04-10T07:00:00.000Z',
      sub_price: null,
      sub_therapistPercentage: null,
      modal_name: 'Group Therapy',
      level_type: null,
      rootsub_type: null,
      gsub_id: 'sub-1',
      gsub_price: 100,
      gsubRootSub_type: 1,
      gatt_id: 'attendee-2',
    },
    {
      session_id: 'session-1',
      session_schedule: '2026-04-10T07:00:00.000Z',
      sub_price: null,
      sub_therapistPercentage: null,
      modal_name: 'Group Therapy',
      level_type: null,
      rootsub_type: null,
      gsub_id: 'sub-2',
      gsub_price: 100,
      gsubRootSub_type: 1,
      gatt_id: 'attendee-2',
    },
    {
      session_id: 'session-1',
      session_schedule: '2026-04-10T07:00:00.000Z',
      sub_price: null,
      sub_therapistPercentage: null,
      modal_name: 'Group Therapy',
      level_type: null,
      rootsub_type: null,
      gsub_id: 'sub-3',
      gsub_price: 100,
      gsubRootSub_type: 1,
      gatt_id: 'attendee-2',
    },
  ];

  function createQueryBuilderMock() {
    return {
      leftJoin: jest.fn().mockReturnThis(),
      innerJoin: jest.fn().mockReturnThis(),
      withDeleted: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue(rawRows),
      getRawOne: jest.fn(),
    };
  }

  beforeEach(async () => {
    const sessionRepo = {
      createQueryBuilder: jest.fn(() => createQueryBuilderMock()),
    };

    const paramService = {
      getAllParsedParams: jest.fn().mockResolvedValue({
        [DefaultParameters.ADVANCED_PRICE_PERCENTAGE]: 0.5,
        [DefaultParameters.ASSOCIATE_PRICE_PERCENTAGE]: 0.4,
        [DefaultParameters.MODERATE_PRICE_PERCENTAGE]: 0.45,
        [DefaultParameters.COUPLE_PRICE_PERCENTAGE]: 0.5,
        [DefaultParameters.GROUP_PRICE_PERCENTAGE]: 0.5,
        [DefaultParameters.VAT]: 0,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TherapistStatisticsService,
        { provide: getRepositoryToken(Session), useValue: sessionRepo },
        { provide: ParameterService, useValue: paramService },
      ],
    }).compile();

    service = module.get<TherapistStatisticsService>(TherapistStatisticsService);
  });

  it('does not multiply total revenue when multiple attendees exist for one group session', async () => {
    const totalRevenue = await service.getTotalRevenue('therapist-1');

    expect(totalRevenue).toBe(37.5);
  });

  it('does not multiply revenue-over-time when multiple attendees exist for one group session', async () => {
    const revenue = await service.getRevenueOverTime('2026-04-01', '2026-04-30', 'therapist-1');

    expect(revenue).toEqual([
      {
        date: '2026-04-10',
        revenueOverTime: 37.5,
        sessionIds: ['session-1'],
      },
    ]);
  });
});
