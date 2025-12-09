import { BadRequestException, ConflictException } from '@nestjs/common';
import { EntitySubscriberInterface, EventSubscriber, InsertEvent, Repository, UpdateEvent } from 'typeorm';
import { TherapistPaymentPeriod } from './therapist-payment-period.entity';

@EventSubscriber()
export class TherapistPaymentPeriodSubscriber implements EntitySubscriberInterface<TherapistPaymentPeriod> {
  /**
   * Indicate that this subscriber only listens to TherapistPaymentPeriod events
   */
  listenTo() {
    return TherapistPaymentPeriod;
  }

  /**
   * Before insert hook
   */
  async beforeInsert(event: InsertEvent<TherapistPaymentPeriod>) {
      const repo = event.manager.getRepository(TherapistPaymentPeriod);
    await this.validatePeriodAndSessions(event.entity, repo);
  }

  /**
   * Before update hook
   */
  async beforeUpdate(event: UpdateEvent<TherapistPaymentPeriod>) {
    if (event.entity) {
      const repo = event.manager.getRepository(TherapistPaymentPeriod)
      await this.validatePeriodAndSessions(event.entity, repo);
    }
  }

  /**
   * Core validation logic
   */
  private async validatePeriodAndSessions(
    entity: Partial<TherapistPaymentPeriod>,
    repo: Repository<TherapistPaymentPeriod>
  ) {

    const start = new Date(entity.startDate);
    const end = new Date(entity.endDate);

    if (start >= end) {
      throw new BadRequestException('startDate must be before endDate.');
    }

    // Check overlapping periods for the same therapist
    console.log({entity})
    const overlap = await repo
      .createQueryBuilder('period')
      .where('period.therapistId = :therapistId', { therapistId: entity.therapist.id })
      .andWhere('period.startDate < :end AND period.endDate > :start', { start, end })
      .andWhere('period.id != :id', { id: entity.id || '0' })
      .getMany();
      console.log({overlap})
    if (overlap.length > 0) {
      throw new ConflictException({
          message:'A payment record for this therapist in this period already exists.',
          items:[...overlap] });
    }

    // Check that sessions are not included in other periods
    if (entity.session && entity.session.length > 0) {
      const sessionIds = entity.session.map(s => s.id);

      const conflicting = await repo
        .createQueryBuilder('period')
        .leftJoin('period.session', 'session')
        .where('period.therapistId = :therapistId', { therapistId: entity.therapist.id })
        .andWhere('period.id != :id', { id: entity.id || '0' })
        .getMany();

      for (const existing of conflicting) {
        const existingSessionIds = (existing.session || []).map(s => s.id);
        if (existingSessionIds.some(id => sessionIds.includes(id))) {
          throw new BadRequestException('One or more sessions are already included in another period for this therapist.');
        }
      }
    }
  }
}
